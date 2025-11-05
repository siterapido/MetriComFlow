// Edge Function: sync-adset-insights
// Description: Sincroniza métricas diárias por conjunto de anúncios (ad sets)
// Method: POST
// Auth: Required (service_role or authenticated user)
//
// Body Parameters:
// - since: string (opcional, ISO YYYY-MM-DD)
// - until: string (opcional, ISO YYYY-MM-DD)
// - ad_account_ids: string[] (IDs internos das contas) opcional
// - campaign_ids: string[] (IDs internos das campanhas) opcional
// - ad_set_ids: string[] (IDs internos dos ad sets) opcional
// - maxDaysPerChunk: number (opcional, default 30)
//
// Writes to: public.ad_set_daily_insights (UNIQUE: ad_set_id, date)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_API_VERSION = "v24.0";

type SyncBody = {
  since?: string;
  until?: string;
  ad_account_ids?: string[];
  campaign_ids?: string[];
  ad_set_ids?: string[];
  maxDaysPerChunk?: number;
};

const LEAD_ACTION_TYPES = new Set([
  "lead",
  "leads",
  "leadgen.other",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.lead_form.submit",
]);

function normalizeIsoDate(input: string | undefined, fallbackIso: string): string {
  if (!input) return fallbackIso;
  try {
    const d = new Date(input);
    if (!Number.isFinite(+d)) return fallbackIso;
    return d.toISOString().split("T")[0];
  } catch {
    return fallbackIso;
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function chunkDateRange(since: string, until: string, maxDays: number): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = since;
  while (new Date(cursor + "T00:00:00Z").getTime() <= new Date(until + "T00:00:00Z").getTime()) {
    const proposedEnd = addDays(cursor, maxDays - 1);
    const end = new Date(proposedEnd + "T00:00:00Z").getTime() > new Date(until + "T00:00:00Z").getTime()
      ? until
      : proposedEnd;
    chunks.push({ start: cursor, end });
    cursor = addDays(end, 1);
  }
  return chunks;
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
        },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: SyncBody = await req.json().catch(() => ({} as SyncBody));
    const todayIso = new Date().toISOString().split("T")[0];

    // Força o filtro de 30 dias, ignorando o que vier no body
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split("T")[0];
    const until = todayIso;

    const maxDays = Math.min(Math.max(body.maxDaysPerChunk ?? 30, 1), 90);

    // Resolve contas, campanhas e ad sets
    let accountsQuery = supabase
      .from("ad_accounts")
      .select("id, external_id, provider, is_active")
      .eq("is_active", true)
      .eq("provider", "meta");
    if (body.ad_account_ids?.length) accountsQuery = accountsQuery.in("id", body.ad_account_ids);
    const { data: accounts, error: accountsErr } = await accountsQuery;
    if (accountsErr) throw accountsErr;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active Meta ad accounts found" }), { status: 200 });
    }

    // Token
    const { data: connection } = await supabase
      .from("meta_business_connections")
      .select("access_token")
      .eq("is_active", true)
      .limit(1)
      .single();
    let accessToken = connection?.access_token || Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) return new Response(JSON.stringify({ error: "No Meta access token available" }), { status: 401 });

    // Pré-carregar campanhas e ad sets (mapas para id interno)
    const { data: allCampaigns } = await supabase
      .from("ad_campaigns")
      .select("id, external_id, ad_account_id");
    const campaignsByAccount = new Map<string, { id: string; external_id: string }[]>();
    (allCampaigns || []).forEach((c) => {
      if (!campaignsByAccount.has(c.ad_account_id)) campaignsByAccount.set(c.ad_account_id, []);
      campaignsByAccount.get(c.ad_account_id)!.push({ id: c.id, external_id: c.external_id });
    });

    const { data: allAdSets } = await supabase
      .from("ad_sets")
      .select("id, external_id, campaign_id");
    const adSetByExternal = new Map<string, { id: string; campaign_id: string }>();
    (allAdSets || []).forEach((s) => adSetByExternal.set(s.external_id, { id: s.id, campaign_id: s.campaign_id }));

    const chunks = chunkDateRange(since, until, maxDays);
    let totalRows = 0;
    let totalUpserts = 0;

    for (const account of accounts) {
      const accountCampaigns = (campaignsByAccount.get(account.id) || []);
      if (accountCampaigns.length === 0) continue;

      // Filtrar por campaigns se solicitado
      let campaignFilter = accountCampaigns;
      if (body.campaign_ids?.length) {
        const setIds = new Set(body.campaign_ids);
        campaignFilter = accountCampaigns.filter((c) => setIds.has(c.id));
      }
      if (campaignFilter.length === 0) continue;

      // Se body.ad_set_ids existe, restringe aos ad sets internos informados
      let adSetFilterExternal: string[] | null = null;
      if (body.ad_set_ids?.length) {
        const { data: scopedAdSets } = await supabase
          .from("ad_sets")
          .select("external_id")
          .in("id", body.ad_set_ids);
        adSetFilterExternal = (scopedAdSets || []).map((a) => a.external_id);
        if (adSetFilterExternal.length === 0) continue;
      }

      for (const chunk of chunks) {
        const fields = [
          "adset_id",
          "date_start",
          "date_stop",
          "spend",
          "impressions",
          "clicks",
          "actions",
          "reach",
          "frequency",
          "link_clicks",
          "post_engagement",
        ].join(",");

        // Build filtering clause
        const filters: any[] = [
          { field: "campaign.id", operator: "IN", value: campaignFilter.map((c) => c.external_id) },
        ];
        if (adSetFilterExternal && adSetFilterExternal.length > 0) {
          filters.push({ field: "adset.id", operator: "IN", value: adSetFilterExternal });
        }

        const filtering = encodeURIComponent(JSON.stringify(filters));

        const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${account.external_id}/insights` +
          `?fields=${fields}` +
          `&level=adset` +
          `&time_increment=1` +
          `&filtering=${filtering}` +
          `&time_range={"since":"${chunk.start}","until":"${chunk.end}"}` +
          `&limit=1000` +
          `&access_token=${accessToken}`;

        let nextUrl: string | null = baseUrl;
        const rows: any[] = [];
        while (nextUrl) {
          const res = await fetch(nextUrl);
          if (!res.ok) {
            console.error("Meta API error (adset insights)", account.external_id, res.status, await res.text());
            break;
          }
          const data = await res.json();
          rows.push(...(data?.data || []));
          nextUrl = data?.paging?.next || null;
        }

        totalRows += rows.length;

        // Map to upserts
        const upserts = rows.map((r) => {
          const adsetExternal = String(r.adset_id || "");
          const map = adSetByExternal.get(adsetExternal);
          if (!map) return null;
          const leadsAction = (r.actions || []).find((a: any) => LEAD_ACTION_TYPES.has(a.action_type));
          const leads = leadsAction ? parseInt(String(leadsAction.value)) : 0;
          return {
            ad_set_id: map.id,
            campaign_id: map.campaign_id,
            date: r.date_start,
            spend: parseFloat(String(r.spend ?? "0")) || 0,
            impressions: parseInt(String(r.impressions ?? "0")) || 0,
            clicks: parseInt(String(r.clicks ?? "0")) || 0,
            leads_count: Number.isFinite(leads) ? leads : 0,
            reach: parseInt(String(r.reach ?? "0")) || 0,
            frequency: parseFloat(String(r.frequency ?? "0")) || 0,
            actions: r.actions || null,
            link_clicks: parseInt(String(r.link_clicks ?? "0")) || 0,
            post_engagement: parseInt(String(r.post_engagement ?? "0")) || 0,
          };
        }).filter(Boolean) as any[];

        // Upsert batches
        const batchSize = 500;
        for (let i = 0; i < upserts.length; i += batchSize) {
          const slice = upserts.slice(i, i + batchSize);
          const { error: upErr } = await supabase
            .from("ad_set_daily_insights")
            .upsert(slice, { onConflict: "ad_set_id,date", ignoreDuplicates: false });
          if (upErr) console.error("Upsert error (ad_set_daily_insights)", upErr);
          else totalUpserts += slice.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Ad set insights sync completed", totalRows, totalUpserts, params: { since, until } }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
});

