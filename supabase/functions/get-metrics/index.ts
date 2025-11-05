// Edge Function: get-metrics
// Description: Retorna métricas agregadas para campanhas, conjuntos de anúncios e anúncios.
// Method: POST
// Auth: Required (authenticated user)
//
// Body Parameters:
// - since: string (ISO YYYY-MM-DD)
// - until: string (ISO YYYY-MM-DD)
// - ad_account_ids: string[] (IDs internos das contas)
// - campaign_ids: string[] (IDs internos das campanhas) (opcional)
// - ad_set_ids: string[] (IDs internos dos ad sets) (opcional)
// - ad_ids: string[] (IDs internos dos ads) (opcional)
// - level: 'campaign', 'adSet', 'ad' (nível de agregação)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const body = await req.json();
    const { since, until, ad_account_ids, campaign_ids, ad_set_ids, ad_ids, level } = body;

    if (!since || !until || !ad_account_ids || !level) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    let tableName = "";
    let joinTable = "";
    let selectFields = "";
    let groupByFields = "";
    let filters = "asi.date >= $1 AND asi.date <= $2 AND ads.ad_account_id = ANY($3)";
    const params: (string | string[])[] = [since, until, ad_account_ids];

    if (level === "campaign") {
      tableName = "ad_campaigns";
      joinTable = "ad_set_daily_insights";
      selectFields = "ads.id, ads.name";
      groupByFields = "ads.id, ads.name";
      if (campaign_ids && campaign_ids.length > 0) {
        filters += ` AND ads.id = ANY($${params.length + 1})`;
        params.push(campaign_ids);
      }
    } else if (level === "adSet") {
      tableName = "ad_sets";
      joinTable = "ad_set_daily_insights";
      selectFields = "ads.id, ads.name";
      groupByFields = "ads.id, ads.name";
      if (campaign_ids && campaign_ids.length > 0) {
        filters += ` AND ads.campaign_id = ANY($${params.length + 1})`;
        params.push(campaign_ids);
      }
      if (ad_set_ids && ad_set_ids.length > 0) {
        filters += ` AND ads.id = ANY($${params.length + 1})`;
        params.push(ad_set_ids);
      }
    } else if (level === "ad") {
      tableName = "ads";
      joinTable = "ad_daily_insights";
      selectFields = "ads.id, ads.name";
      groupByFields = "ads.id, ads.name";
      if (campaign_ids && campaign_ids.length > 0) {
        filters += ` AND ads.campaign_id = ANY($${params.length + 1})`;
        params.push(campaign_ids);
      }
      if (ad_set_ids && ad_set_ids.length > 0) {
        filters += ` AND ads.ad_set_id = ANY($${params.length + 1})`;
        params.push(ad_set_ids);
      }
      if (ad_ids && ad_ids.length > 0) {
        filters += ` AND ads.id = ANY($${params.length + 1})`;
        params.push(ad_ids);
      }
    } else {
      return new Response(JSON.stringify({ error: "Invalid level" }), { status: 400 });
    }

    const query = `
      SELECT
        ${selectFields},
        SUM(asi.spend) as spend,
        SUM(asi.impressions) as impressions,
        SUM(asi.clicks) as clicks,
        SUM(asi.leads_count) as leads_count,
        SUM(asi.link_clicks) as link_clicks,
        SUM(asi.post_engagement) as post_engagement
      FROM
        ${tableName} ads
      JOIN
        ${joinTable} asi ON ads.id = asi.${level === 'ad' ? 'ad' : 'ad_set'}_id
      WHERE
        ${filters}
      GROUP BY
        ${groupByFields}
    `;

    const { data, error } = await supabase.rpc("execute_sql", { query, params });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
});
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
});
