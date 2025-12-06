import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-nocheck
// Declaração do Deno para editores que não carregam os tipos do Edge Runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import {
  META_API_VERSION,
  fetchWithBackoff,
  mapAdRecord,
  mapAdSetRecord,
  normalizeMetaPaging,
  resolveAccessToken,
} from "../_shared/meta-sync.ts";

// Carrega o cliente do Supabase dinamicamente para evitar problemas de resolução de módulo
async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

type RequestBody = {
  ad_account_ids?: string[]; // UUIDs internos da tabela ad_accounts
  campaign_ids?: string[]; // UUIDs internos da tabela ad_campaigns
  dryRun?: boolean;
  logResponseSample?: boolean;
  limitPerCampaign?: number;
};

type Campaign = {
  id: string;
  external_id: string | null;
  ad_account_id: string;
  ad_accounts?: {
    connected_by?: string | null;
  } | null;
};

type SupabaseClient = any;

/** Utilitário para JSON response */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: RequestBody = await req.json().catch(() => ({}));

    // Carregar campanhas
    let campaigns: Campaign[] = [];
    const baseQuery = supabase
      .from("ad_campaigns")
      .select("id, external_id, ad_account_id, ad_accounts!inner(connected_by, provider, is_active)");

    if (body.campaign_ids?.length) {
      const { data, error } = await baseQuery.in("id", body.campaign_ids)
        .eq("ad_accounts.provider", "meta")
        .eq("ad_accounts.is_active", true);
      if (error) throw error;
      campaigns = (data ?? []) as Campaign[];
    } else if (body.ad_account_ids?.length) {
      const { data, error } = await baseQuery
        .in("ad_account_id", body.ad_account_ids)
        .eq("ad_accounts.provider", "meta")
        .eq("ad_accounts.is_active", true);
      if (error) throw error;
      campaigns = (data ?? []) as Campaign[];
    } else {
      const { data, error } = await baseQuery
        .eq("ad_accounts.provider", "meta")
        .eq("ad_accounts.is_active", true)
        .limit(1000);
      if (error) throw error;
      campaigns = (data ?? []) as Campaign[];
    }

    const summary = {
      campaignsProcessed: 0,
      adsetsSynced: 0,
      adsSynced: 0,
      errors: [] as string[],
    };
    const tokenCache = new Map<string, string | null>();

    for (const campaign of campaigns) {
      if (!campaign.external_id) {
        summary.errors.push(`Campaign ${campaign.id} missing external_id`);
        continue;
      }

      const connectedBy = (campaign as any)?.ad_accounts?.connected_by ?? null;
      const token = await resolveAccessToken(supabase, connectedBy, tokenCache);
      if (!token) {
        summary.errors.push(`No Meta token found for ad_account ${campaign.ad_account_id}`);
        continue;
      }

      // Buscar Ad Sets
      const adsetsUrl = `https://graph.facebook.com/${META_API_VERSION}/${campaign.external_id}/adsets` +
        `?fields=id,name,status,optimization_goal,billing_event,bid_strategy,targeting,daily_budget,lifetime_budget,start_time,end_time` +
        `&limit=200&access_token=${encodeURIComponent(token)}`;
      const adsetsRes = await fetchWithBackoff(adsetsUrl, { method: "GET" });
      if (!adsetsRes.ok) {
        summary.errors.push(`Adsets fetch failed for campaign ${campaign.external_id}: ${adsetsRes.status}`);
        continue;
      }
      const adsetsJson = await adsetsRes.json();
      const adsets = normalizeMetaPaging(adsetsJson);

      const adsetsRecords = adsets.map((a: any) => mapAdSetRecord(a, campaign.id));

      let upsertedAdsets: { id: string; external_id: string }[] = [];
      if (!body.dryRun && adsetsRecords.length) {
        const { data, error } = await supabase
          .from("ad_sets")
          .upsert(adsetsRecords, { onConflict: "external_id" })
          .select("id, external_id");
        if (error) throw error;
        upsertedAdsets = (data ?? []) as { id: string; external_id: string }[];
        summary.adsetsSynced += upsertedAdsets.length || adsetsRecords.length;
      }

      const adsetIdByExternal: Record<string, string> = {};
      for (const r of upsertedAdsets) adsetIdByExternal[r.external_id] = r.id;

      // Para cada Ad Set, buscar Ads
      for (const a of adsets) {
        const adsetInternalId = adsetIdByExternal[String(a.id)] ?? null;
        if (!adsetInternalId) continue;

        const adsUrl = `https://graph.facebook.com/${META_API_VERSION}/${a.id}/ads` +
          `?fields=id,name,status,creative{id,image_url,thumbnail_url,object_story_spec,asset_feed_spec},effective_object_story_id,adset_id,created_time,updated_time` +
          `&limit=200&access_token=${encodeURIComponent(token)}`;
        const adsRes = await fetchWithBackoff(adsUrl, { method: "GET" });
        if (!adsRes.ok) {
          summary.errors.push(`Ads fetch failed for adset ${a.id}: ${adsRes.status}`);
          continue;
        }
        const adsJson = await adsRes.json();
        const ads = normalizeMetaPaging(adsJson);

        const adsRecords = ads.map((ad: any) => mapAdRecord(ad, adsetInternalId, campaign.id));

        if (!body.dryRun && adsRecords.length) {
          const { data, error } = await supabase
            .from("ads")
            .upsert(adsRecords, { onConflict: "external_id" })
            .select("external_id");
          if (error) throw error;
          summary.adsSynced += (data ?? []).length || adsRecords.length;
        }

        if (body.logResponseSample) {
          console.log(JSON.stringify({
            campaign: campaign.external_id,
            adset: a.id,
            sampleAds: ads.slice(0, 2),
          }, null, 2));
        }
      }

      summary.campaignsProcessed++;
      if (body.limitPerCampaign && summary.campaignsProcessed >= body.limitPerCampaign) break;
    }

    return json(summary);
  } catch (e: any) {
    console.error("insightfy-adsets-ads-sync error:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
