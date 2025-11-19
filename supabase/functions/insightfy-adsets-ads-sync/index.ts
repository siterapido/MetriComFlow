import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-nocheck
// Declaração do Deno para editores que não carregam os tipos do Edge Runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

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

/** Converte timestamps do Meta em ISO string ou null */
function tsOrNull(v: unknown): string | null {
  if (!v) return null;
  const s = typeof v === "string" ? v : String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Converte budget (string/number) em decimal ou null */
function budgetToDecimal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

/** Normaliza resposta paginada do Graph API */
function normalizeMetaPaging(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

/** Backoff simples para 429 */
async function fetchWithBackoff(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < tries) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const waitMs = 500 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
    attempt++;
  }
  return fetch(url, init);
}

/** Resolve token do Meta para uma campanha via ad_account.connected_by → meta_business_connections */
async function resolveTokenForCampaign(supabase: SupabaseClient, adAccountId: string): Promise<string | null> {
  const { data: account, error: accErr } = await supabase
    .from("ad_accounts")
    .select("connected_by")
    .eq("id", adAccountId)
    .single();
  if (accErr || !account?.connected_by) return null;

  const { data: conn, error: connErr } = await supabase
    .from("meta_business_connections")
    .select("access_token, connected_at, is_active")
    .eq("user_id", account.connected_by)
    .eq("is_active", true)
    .order("connected_at", { ascending: false })
    .limit(1);
  if (connErr || !conn?.[0]?.access_token) return null;
  return conn[0].access_token as string;
}

/** Detecta tipo de criativo a partir de object_story_spec */
function detectCreativeType(oss: any): string | null {
  if (!oss) return null;
  if (oss.video_data) return "VIDEO";
  if (oss.carousel_data) return "CAROUSEL";
  if (oss.link_data) return "IMAGE"; // simplificação: link_data geralmente é imagem
  return null;
}

function extractImageUrl(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.image_url) return String(oss.link_data.image_url);
  const att = oss.carousel_data?.child_attachments;
  if (Array.isArray(att) && att[0]?.image_url) return String(att[0].image_url);
  return null;
}

function extractVideoUrl(oss: any): string | null {
  if (!oss) return null;
  if (oss.video_data?.video_url) return String(oss.video_data.video_url);
  return null;
}

function extractTitle(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.name) return String(oss.link_data.name);
  const att = oss.carousel_data?.child_attachments;
  if (Array.isArray(att) && att[0]?.name) return String(att[0].name);
  return null;
}

function extractBody(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.message) return String(oss.link_data.message);
  if (oss.video_data?.message) return String(oss.video_data.message);
  return null;
}

function extractCTA(oss: any): string | null {
  if (!oss) return null;
  return oss.link_data?.call_to_action?.type ? String(oss.link_data.call_to_action.type) : null;
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
    if (body.campaign_ids?.length) {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, external_id, ad_account_id")
        .in("id", body.campaign_ids);
      if (error) throw error;
      campaigns = (data ?? []) as Campaign[];
    } else if (body.ad_account_ids?.length) {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, external_id, ad_account_id")
        .in("ad_account_id", body.ad_account_ids);
      if (error) throw error;
      campaigns = (data ?? []) as Campaign[];
    } else {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, external_id, ad_account_id")
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

    for (const campaign of campaigns) {
      if (!campaign.external_id) {
        summary.errors.push(`Campaign ${campaign.id} missing external_id`);
        continue;
      }

      const token = await resolveTokenForCampaign(supabase, campaign.ad_account_id);
      if (!token) {
        summary.errors.push(`No Meta token found for ad_account ${campaign.ad_account_id}`);
        continue;
      }

      // Buscar Ad Sets
      const adsetsUrl = `https://graph.facebook.com/v24.0/${campaign.external_id}/adsets` +
        `?fields=id,name,status,optimization_goal,billing_event,bid_strategy,targeting,daily_budget,lifetime_budget,start_time,end_time` +
        `&limit=200&access_token=${encodeURIComponent(token)}`;
      const adsetsRes = await fetchWithBackoff(adsetsUrl, { method: "GET" });
      if (!adsetsRes.ok) {
        summary.errors.push(`Adsets fetch failed for campaign ${campaign.external_id}: ${adsetsRes.status}`);
        continue;
      }
      const adsetsJson = await adsetsRes.json();
      const adsets = normalizeMetaPaging(adsetsJson);

      const adsetsRecords = adsets.map((a: any) => ({
        external_id: String(a.id),
        campaign_id: campaign.id,
        name: a.name ?? "",
        status: a.status ?? null,
        optimization_goal: a.optimization_goal ?? null,
        billing_event: a.billing_event ?? null,
        bid_strategy: a.bid_strategy ?? null,
        targeting: a.targeting ?? null,
        daily_budget: budgetToDecimal(a.daily_budget),
        lifetime_budget: budgetToDecimal(a.lifetime_budget),
        start_time: tsOrNull(a.start_time),
        end_time: tsOrNull(a.end_time),
        updated_at: new Date().toISOString(),
      }));

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

        const adsUrl = `https://graph.facebook.com/v24.0/${a.id}/ads` +
          `?fields=id,name,status,creative{object_story_spec,thumbnail_url},effective_object_story_id,adset_id,created_time` +
          `&limit=200&access_token=${encodeURIComponent(token)}`;
        const adsRes = await fetchWithBackoff(adsUrl, { method: "GET" });
        if (!adsRes.ok) {
          summary.errors.push(`Ads fetch failed for adset ${a.id}: ${adsRes.status}`);
          continue;
        }
        const adsJson = await adsRes.json();
        const ads = normalizeMetaPaging(adsJson);

        const adsRecords = ads.map((ad: any) => {
          const creative = ad.creative ?? {};
          const oss = creative.object_story_spec ?? {};
          const creativeType = detectCreativeType(oss);
          const imageUrl = creative.thumbnail_url ?? extractImageUrl(oss);
          const videoUrl = extractVideoUrl(oss);
          const title = extractTitle(oss);
          const bodyText = extractBody(oss);
          const cta = extractCTA(oss);

          return {
            external_id: String(ad.id),
            ad_set_id: adsetInternalId,
            campaign_id: campaign.id,
            name: ad.name ?? "",
            status: ad.status ?? null,
            creative_type: creativeType ?? null,
            thumbnail_url: creative.thumbnail_url ?? null,
            image_url: imageUrl ?? null,
            video_url: videoUrl ?? null,
            title: title ?? null,
            body: bodyText ?? null,
            call_to_action_type: cta ?? null,
            creative_data: creative || oss || null,
            updated_at: new Date().toISOString(),
          };
        });

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
