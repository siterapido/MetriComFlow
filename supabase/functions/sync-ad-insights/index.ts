// Edge Function: sync-ad-insights
// Description: Sincroniza métricas diárias por anúncio/criativo (ad)
// Method: POST
// Auth: Required (service_role or authenticated user)
//
// Body Parameters:
// - since: string (opcional, ISO YYYY-MM-DD)
// - until: string (opcional, ISO YYYY-MM-DD)
// - ad_account_ids: string[] (IDs internos das contas) opcional
// - campaign_ids: string[] (IDs internos das campanhas) opcional
// - ad_set_ids: string[] (IDs internos dos ad sets) opcional
// - ad_ids: string[] (IDs internos dos ads) opcional
// - maxDaysPerChunk: number (opcional, default 30)
//
// Writes to: public.ad_daily_insights (UNIQUE: ad_id, date)

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
  ad_ids?: string[];
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

    // Use provided dates or default to last 30 days
    const since = body.since || (() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo.toISOString().split("T")[0];
    })();
    const until = body.until || todayIso;

    const maxDays = Math.min(Math.max(body.maxDaysPerChunk ?? 30, 1), 90);

    // Resolver contas
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
    const accessToken = connection?.access_token || Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) return new Response(JSON.stringify({ error: "No Meta access token available" }), { status: 401 });

    // Pré-carregar campanhas, ad sets e ads
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

    const { data: allAds } = await supabase
      .from("ads")
      .select("id, external_id, ad_set_id, campaign_id");
    const adByExternal = new Map<string, { id: string; ad_set_id: string | null; campaign_id: string | null }>();
    (allAds || []).forEach((a) => adByExternal.set(a.external_id, { id: a.id, ad_set_id: a.ad_set_id, campaign_id: a.campaign_id }));

    const chunks = chunkDateRange(since, until, maxDays);
    let totalRows = 0;
    let totalUpserts = 0;

    for (const account of accounts) {
      let campaignFilter = (campaignsByAccount.get(account.id) || []);
      if (body.campaign_ids?.length) {
        const setIds = new Set(body.campaign_ids);
        campaignFilter = campaignFilter.filter((c) => setIds.has(c.id));
      }
      if (campaignFilter.length === 0) continue;

      // Se filtros por adset/ad foram passados, resolvê-los para externos
      let adSetFilterExternal: string[] | null = null;
      if (body.ad_set_ids?.length) {
        const { data: scopedAdSets } = await supabase
          .from("ad_sets")
          .select("external_id")
          .in("id", body.ad_set_ids);
        adSetFilterExternal = (scopedAdSets || []).map((a) => a.external_id);
        if (adSetFilterExternal.length === 0) continue;
      }

      let adFilterExternal: string[] | null = null;
      if (body.ad_ids?.length) {
        const { data: scopedAds } = await supabase
          .from("ads")
          .select("external_id")
          .in("id", body.ad_ids);
        adFilterExternal = (scopedAds || []).map((a) => a.external_id);
        if (adFilterExternal.length === 0) continue;
      }

      for (const chunk of chunks) {
        const fields = [
          "ad_id",
          "adset_id",
          "campaign_id",
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
          "video_views",
          "video_avg_time_watched",
          "quality_ranking",
          "engagement_rate_ranking",
          "conversion_rate_ranking",
        ].join(",");

        const filters: any[] = [
          { field: "campaign.id", operator: "IN", value: campaignFilter.map((c) => c.external_id) },
        ];
        if (adSetFilterExternal && adSetFilterExternal.length > 0) {
          filters.push({ field: "adset.id", operator: "IN", value: adSetFilterExternal });
        }
        if (adFilterExternal && adFilterExternal.length > 0) {
          filters.push({ field: "ad.id", operator: "IN", value: adFilterExternal });
        }
        const filtering = encodeURIComponent(JSON.stringify(filters));

        const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${account.external_id}/insights` +
          `?fields=${fields}` +
          `&level=ad` +
          `&time_increment=1` +
          `&filtering=${filtering}` +
          `&time_range={"since":"${chunk.start}","until":"${chunk.end}"}` +
          `&limit=1000` +
          `&access_token=${accessToken}`;

        let nextUrl: string | null = baseUrl;
        const rows: any[] = [];
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        let retries = 0;
        while (nextUrl) {
          const res = await fetch(nextUrl);
          if (!res.ok) {
            const body = await res.text();
            console.error("Meta API error (ad insights)", account.external_id, res.status, body);
            if ((res.status === 429 || res.status >= 500) && retries < 3) {
              retries++;
              await sleep(800 * retries);
              continue;
            }
            break;
          }
          const data = await res.json();
          const fetchedRows = data?.data || [];
          if (fetchedRows.length > 0 && rows.length === 0) {
            // Log first batch for debugging
            console.log(`📥 First batch from Meta API: ${fetchedRows.length} rows`);
            console.log(`📥 Sample row:`, {
              ad_id: fetchedRows[0]?.ad_id,
              date_start: fetchedRows[0]?.date_start,
              spend: fetchedRows[0]?.spend,
            });
          }
          rows.push(...fetchedRows);
          nextUrl = data?.paging?.next || null;
          await sleep(120);
        }

        totalRows += rows.length;
        
        // Debug: log mapping stats
        if (rows.length > 0) {
          console.log(`📊 Processing ${rows.length} ad insight rows for account ${account.external_id}`);
          const sampleExternalIds = rows.slice(0, 3).map((r: any) => r.ad_id);
          console.log(`📊 Sample ad external IDs from Meta:`, sampleExternalIds);
          console.log(`📊 Total ads in DB: ${adByExternal.size}`);
        }

        const upserts = rows.map((r) => {
          const adExternal = String(r.ad_id || "");
          const map = adByExternal.get(adExternal);
          if (!map) {
            // Log unmapped ad for debugging
            if (rows.length > 0 && rows.indexOf(r) < 5) {
              console.warn(`⚠️ Ad external_id ${adExternal} not found in DB`);
            }
            return null;
          }
          const leadsAction = (r.actions || []).find((a: any) => LEAD_ACTION_TYPES.has(a.action_type));
          const leads = leadsAction ? parseInt(String(leadsAction.value)) : 0;
          
          const spend = parseFloat(String(r.spend ?? "0")) || 0;
          const impressions = parseInt(String(r.impressions ?? "0")) || 0;
          const clicks = parseInt(String(r.clicks ?? "0")) || 0;
          const leadsCount = Number.isFinite(leads) ? leads : 0;
          
          // Calculate derived metrics
          const cpc = clicks > 0 ? spend / clicks : 0;
          const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
          const cpl = leadsCount > 0 ? spend / leadsCount : 0;
          
          return {
            ad_id: map.id,
            ad_set_id: map.ad_set_id,
            campaign_id: map.campaign_id,
            date: r.date_start,
            spend,
            impressions,
            clicks,
            leads_count: leadsCount,
            reach: parseInt(String(r.reach ?? "0")) || 0,
            frequency: parseFloat(String(r.frequency ?? "0")) || 0,
            actions: r.actions || null,
            cpc,
            cpm,
            cpl,
            link_clicks: parseInt(String(r.link_clicks ?? "0")) || 0,
            post_engagement: parseInt(String(r.post_engagement ?? "0")) || 0,
            video_views: parseInt(String(r.video_views ?? "0")) || 0,
            video_avg_time_watched: parseFloat(String(r.video_avg_time_watched ?? "0")) || 0,
            quality_ranking: r.quality_ranking || null,
            engagement_ranking: r.engagement_rate_ranking || null,
            conversion_ranking: r.conversion_rate_ranking || null,
          };
        }).filter(Boolean) as any[];

        // Upsert batches
        const batchSize = 500;
        console.log(`💾 Attempting to upsert ${upserts.length} ad insights`);
        for (let i = 0; i < upserts.length; i += batchSize) {
          const slice = upserts.slice(i, i + batchSize);
          const { error: upErr } = await supabase
            .from("ad_daily_insights")
            .upsert(slice, { onConflict: "ad_id,date", ignoreDuplicates: false });
          if (upErr) {
            console.error("❌ Upsert error (ad_daily_insights)", upErr);
            console.error("❌ Sample data:", slice[0]);
          } else {
            totalUpserts += slice.length;
            console.log(`✅ Upserted ${slice.length} ad insights (total: ${totalUpserts})`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Ad insights sync completed", totalRows, totalUpserts, params: { since, until } }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
});

