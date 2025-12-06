// Edge Function: get-metrics
// Description: Retorna métricas agregadas para conjuntos de anúncios (adSet) e anúncios (ad) usando funções SQL dedicadas.
// Method: POST
// Auth: Required (authenticated user)
//
// Body Parameters:
// - since: string (ISO YYYY-MM-DD)
// - until: string (ISO YYYY-MM-DD)
// - ad_account_ids: string[] (IDs internos das contas) [suporta 1 conta por chamada neste MVP]
// - campaign_ids?: string[]
// - ad_set_ids?: string[]
// - ad_ids?: string[]
// - level: 'adSet' | 'ad' | 'campaign' (campaign ainda não suportado por esta função)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
    "Content-Type": "application/json",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { since, until, ad_account_ids, campaign_ids, ad_set_ids, ad_ids, level } = body ?? {};

    if (!since || !until || !ad_account_ids || !Array.isArray(ad_account_ids) || ad_account_ids.length === 0 || !level) {
      console.warn(JSON.stringify({ event: "metrics_param_error", since, until, accountCount: Array.isArray(ad_account_ids) ? ad_account_ids.length : 0, level }));
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes.", reason: "missing_params" }), { status: 400, headers: corsHeaders() });
    }
    const accountIds: string[] = ad_account_ids;
    const singleAccountId = accountIds.length === 1 ? accountIds[0] : null;
    const startDate = since;
    const endDate = until;

    if (level === "campaign") {
      console.warn(JSON.stringify({ event: "metrics_invalid_level", level }));
      return new Response(JSON.stringify({ error: "Nível 'campaign' não suportado nesta função. Utilize visão/materialized view específica ou função dedicada.", reason: "invalid_level" }), { status: 400, headers: corsHeaders() });
    }

    if (level === "adSet") {
      // Suporta um campaign_id/ad_set_id opcional (se múltiplos forem enviados, usa o primeiro)
      const campaignId = Array.isArray(campaign_ids) && campaign_ids.length > 0 ? campaign_ids[0] : null;
      const adSetId = Array.isArray(ad_set_ids) && ad_set_ids.length > 0 ? ad_set_ids[0] : null;

      if (singleAccountId) {
        try {
          const { data, error } = await supabase.rpc("get_ad_set_metrics", {
            p_account_id: singleAccountId,
            p_campaign_id: campaignId,
            p_ad_set_id: adSetId,
            p_start_date: startDate,
            p_end_date: endDate,
          });
          if (error) throw error;
          const mapped = (data ?? []).map((row: any) => ({
            id: row.ad_set_id,
            name: row.ad_set_name,
            spend: Number(row.spend ?? 0),
            impressions: Number(row.impressions ?? 0),
            clicks: Number(row.clicks ?? 0),
            leads_count: Number(row.leads_count ?? 0),
            link_clicks: Number(row.link_clicks ?? 0),
            post_engagement: Number(row.post_engagement ?? 0),
          }));
          const t1 = Date.now();
          console.log(JSON.stringify({ event: "metrics_response", level: "adSet", accountCount: accountIds.length, campaignsRequested: Array.isArray(campaign_ids) ? campaign_ids.length : 0, rows: mapped.length, durationMs: t1 - t0 }));
          return new Response(JSON.stringify({ success: true, data: mapped }), { status: 200, headers: corsHeaders() });
        } catch (error) {
          console.error(JSON.stringify({ event: "metrics_fallback_error", level: "adSet", error: String(error) }));
        }
      }
      let combinedCampaignIds: string[] = [];
      if (Array.isArray(campaign_ids) && campaign_ids.length > 0) {
        combinedCampaignIds = campaign_ids.slice(0, 10000);
      } else {
        for (const accId of accountIds) {
          const { data: campRows, error: campErr } = await supabase
            .from("ad_campaigns")
            .select("id")
            .eq("ad_account_id", accId)
            .limit(10000);
          if (campErr) {
            return new Response(JSON.stringify({ error: campErr.message, reason: "campaigns_query_failed" }), { status: 500, headers: corsHeaders() });
          }
          const ids = (campRows ?? []).map((r: any) => r.id);
          combinedCampaignIds.push(...ids);
        }
        combinedCampaignIds = Array.from(new Set(combinedCampaignIds));
      }
      let insightsQuery = supabase
        .from("ad_set_daily_insights")
        .select("ad_set_id, spend, impressions, clicks, leads_count, link_clicks, post_engagement, date, campaign_id")
        .gte("date", startDate)
        .lte("date", endDate)
        .limit(50000);
      if (adSetId) insightsQuery = insightsQuery.eq("ad_set_id", adSetId);
      if (combinedCampaignIds.length > 0) insightsQuery = insightsQuery.in("campaign_id", combinedCampaignIds);
      const { data: insightRows, error: insightErr } = await insightsQuery;
        if (insightErr) {
          return new Response(JSON.stringify({ error: insightErr.message, reason: "insights_query_failed" }), { status: 500, headers: corsHeaders() });
        }
      const uniqueAdSetIds = Array.from(new Set((insightRows ?? []).map((r: any) => r.ad_set_id)));
      const { data: adSetRows, error: adSetErr } = await supabase
        .from("ad_sets")
        .select("id, name, status, daily_budget, lifetime_budget")
        .in("id", uniqueAdSetIds)
        .limit(10000);
      if (adSetErr) {
        return new Response(JSON.stringify({ error: adSetErr.message, reason: "ad_sets_query_failed" }), { status: 500, headers: corsHeaders() });
      }
      const adSetInfoById = new Map<string, any>();
      (adSetRows ?? []).forEach((r: any) => adSetInfoById.set(r.id, r));
      const agg = new Map<string, any>();
      for (const row of (insightRows ?? [])) {
        const id = row.ad_set_id as string;
        const info = adSetInfoById.get(id);
        const cur = agg.get(id) ?? {
          id,
          name: info?.name ?? "—",
          status: info?.status ?? null,
          daily_budget: Number(info?.daily_budget ?? 0),
          lifetime_budget: Number(info?.lifetime_budget ?? 0),
          spend: 0,
          impressions: 0,
          clicks: 0,
          leads_count: 0,
          link_clicks: 0,
          post_engagement: 0,
        };
        cur.spend += Number(row.spend ?? 0);
        cur.impressions += Number(row.impressions ?? 0);
        cur.clicks += Number(row.clicks ?? 0);
        cur.leads_count += Number(row.leads_count ?? 0);
        cur.link_clicks += Number(row.link_clicks ?? 0);
        cur.post_engagement += Number(row.post_engagement ?? 0);
        agg.set(id, cur);
      }
      const mapped = Array.from(agg.values());
      const t1 = Date.now();
      console.log(JSON.stringify({ event: "metrics_response", level: "adSet", accountCount: accountIds.length, campaignCount: combinedCampaignIds.length, rows: mapped.length, durationMs: t1 - t0 }));
      return new Response(JSON.stringify({ success: true, data: mapped }), { status: 200, headers: corsHeaders() });
    }

    if (level === "ad") {
      const campaignId = Array.isArray(campaign_ids) && campaign_ids.length > 0 ? campaign_ids[0] : null;
      const adSetId = Array.isArray(ad_set_ids) && ad_set_ids.length > 0 ? ad_set_ids[0] : null;
      const adId = Array.isArray(ad_ids) && ad_ids.length > 0 ? ad_ids[0] : null;

      if (singleAccountId) {
        try {
          const { data, error } = await supabase.rpc("get_ad_metrics", {
            p_account_id: singleAccountId,
            p_campaign_id: campaignId,
            p_ad_set_id: adSetId,
            p_ad_id: adId,
            p_start_date: startDate,
            p_end_date: endDate,
          });
          if (error) throw error;
          const mapped = (data ?? []).map((row: any) => ({
            id: row.ad_id,
            name: row.ad_name,
            spend: Number(row.spend ?? 0),
            impressions: Number(row.impressions ?? 0),
            clicks: Number(row.clicks ?? 0),
            leads_count: Number(row.leads_count ?? 0),
            link_clicks: Number(row.link_clicks ?? 0),
            post_engagement: Number(row.post_engagement ?? 0),
          }));
          const t1 = Date.now();
          console.log(JSON.stringify({ event: "metrics_response", level: "ad", accountCount: accountIds.length, campaignsRequested: Array.isArray(campaign_ids) ? campaign_ids.length : 0, rows: mapped.length, durationMs: t1 - t0 }));
          return new Response(JSON.stringify({ success: true, data: mapped }), { status: 200, headers: corsHeaders() });
        } catch (error) {
          console.error(JSON.stringify({ event: "metrics_fallback_error", level: "ad", error: String(error) }));
        }
      }
      let combinedCampaignIds: string[] = [];
      if (Array.isArray(campaign_ids) && campaign_ids.length > 0) {
        combinedCampaignIds = campaign_ids.slice(0, 10000);
      } else {
        for (const accId of accountIds) {
          const { data: campRows, error: campErr } = await supabase
            .from("ad_campaigns")
            .select("id")
            .eq("ad_account_id", accId)
            .limit(10000);
          if (campErr) {
            return new Response(JSON.stringify({ error: campErr.message, reason: "campaigns_query_failed" }), { status: 500, headers: corsHeaders() });
          }
          const ids = (campRows ?? []).map((r: any) => r.id);
          combinedCampaignIds.push(...ids);
        }
        combinedCampaignIds = Array.from(new Set(combinedCampaignIds));
      }
      let insightsQuery = supabase
        .from("ad_daily_insights")
        .select("ad_id, spend, impressions, clicks, leads_count, link_clicks, post_engagement, date, campaign_id, ad_set_id")
        .gte("date", startDate)
        .lte("date", endDate)
        .limit(50000);
      if (adSetId) insightsQuery = insightsQuery.eq("ad_set_id", adSetId);
      if (adId) insightsQuery = insightsQuery.eq("ad_id", adId);
      if (combinedCampaignIds.length > 0) insightsQuery = insightsQuery.in("campaign_id", combinedCampaignIds);
      const { data: insightRows, error: insightErr } = await insightsQuery;
      if (insightErr) {
        return new Response(JSON.stringify({ error: insightErr.message, reason: "insights_query_failed" }), { status: 500, headers: corsHeaders() });
      }
      const uniqueAdIds = Array.from(new Set((insightRows ?? []).map((r: any) => r.ad_id)));
      const { data: adRows, error: adErr } = await supabase
        .from("ads")
        .select("id, name, status, creative_data, image_url, thumbnail_url")
        .in("id", uniqueAdIds)
        .limit(10000);
      if (adErr) {
        return new Response(JSON.stringify({ error: adErr.message, reason: "ads_query_failed" }), { status: 500, headers: corsHeaders() });
      }
      const adInfoById = new Map<string, any>();
      (adRows ?? []).forEach((r: any) => adInfoById.set(r.id, r));
      const agg = new Map<string, any>();
      for (const row of (insightRows ?? [])) {
        const id = row.ad_id as string;
        const info = adInfoById.get(id);
        let linkUrl = undefined as string | undefined;
        let title = undefined as string | undefined;
        let text = undefined as string | undefined;
        try {
          const spec = info?.creative_data?.object_story_spec ?? info?.creative_data?.object_story_spec ?? null;
          if (spec) {
            // Try link_data (IMAGE type)
            const ld = spec.link_data ?? null;
            if (ld) {
              linkUrl = ld.link || ld.call_to_action?.value?.link_url || undefined;
              title = ld.name || ld.call_to_action?.value?.link_title || undefined;
              text = ld.message || undefined;
            }
            
            // Try video_data (VIDEO type)
            if (!linkUrl || !title || !text) {
              const vd = spec.video_data ?? null;
              if (vd) {
                linkUrl = linkUrl || vd.link || vd.call_to_action?.value?.link_url || undefined;
                title = title || vd.title || vd.call_to_action?.value?.link_title || undefined;
                text = text || vd.message || undefined;
              }
            }
            
            // Try carousel_data (CAROUSEL type)
            if (!linkUrl || !title || !text) {
              const cd = spec.carousel_data ?? null;
              if (cd) {
                linkUrl = linkUrl || cd.link || cd.call_to_action?.value?.link_url || undefined;
                title = title || cd.name || undefined;
                text = text || cd.message || undefined;
                // Try first child attachment
                const firstChild = cd.child_attachments?.[0];
                if (firstChild) {
                  linkUrl = linkUrl || firstChild.link || undefined;
                  title = title || firstChild.name || undefined;
                  text = text || firstChild.description || undefined;
                }
              }
            }
            
            // Try collection_data (COLLECTION type)
            if (!linkUrl || !title || !text) {
              const cold = spec.collection_data ?? null;
              if (cold) {
                linkUrl = linkUrl || cold.link || undefined;
                title = title || cold.name || undefined;
                text = text || cold.description || undefined;
              }
            }
          }
          
          // Fallback to direct fields from ads table
          if (!linkUrl) linkUrl = info?.link_url || undefined;
          if (!title) title = info?.title || undefined;
          if (!text) text = info?.body || undefined;
        } catch (e) {
          console.warn("Error extracting creative data:", e);
        }
        const cur = agg.get(id) ?? {
          id,
          name: info?.name ?? "—",
          status: info?.status ?? null,
          creative_title: title ?? null,
          creative_text: text ?? null,
          creative_link_url: linkUrl ?? null,
          image_url: info?.image_url ?? null,
          thumbnail_url: info?.thumbnail_url ?? null,
          spend: 0,
          impressions: 0,
          clicks: 0,
          leads_count: 0,
          link_clicks: 0,
          post_engagement: 0,
        };
        cur.spend += Number(row.spend ?? 0);
        cur.impressions += Number(row.impressions ?? 0);
        cur.clicks += Number(row.clicks ?? 0);
        cur.leads_count += Number(row.leads_count ?? 0);
        cur.link_clicks += Number(row.link_clicks ?? 0);
        cur.post_engagement += Number(row.post_engagement ?? 0);
        agg.set(id, cur);
      }
      const mapped = Array.from(agg.values());
      const t1 = Date.now();
      console.log(JSON.stringify({ event: "metrics_response", level: "ad", accountCount: accountIds.length, campaignCount: combinedCampaignIds.length, rows: mapped.length, durationMs: t1 - t0 }));
      return new Response(JSON.stringify({ success: true, data: mapped }), { status: 200, headers: corsHeaders() });
    }

    return new Response(JSON.stringify({ error: "Nível inválido." }), { status: 400, headers: corsHeaders() });
  } catch (error) {
    const t1 = Date.now();
    console.error(JSON.stringify({ event: "metrics_error", message: (error as Error).message, durationMs: t1 - t0 }));
    return new Response(JSON.stringify({ error: (error as Error).message, reason: "unexpected_error" }), { status: 500, headers: corsHeaders() });
  }
});
