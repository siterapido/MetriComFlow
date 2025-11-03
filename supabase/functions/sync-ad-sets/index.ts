// Edge Function: sync-ad-sets
// Description: Sincroniza conjuntos de anúncios (ad sets) do Meta Ads para o banco de dados
// Method: POST
// Auth: Required (service_role or authenticated user)
//
// Body Parameters:
// - campaign_ids: string[] (opcional) - IDs internos das campanhas para sincronizar
// - ad_account_ids: string[] (opcional) - IDs internos das contas para sincronizar todas as campanhas
// - since: string (opcional) - Data inicial para filtrar ad sets ativos
//
// Returns: { success: boolean, synced_ad_sets: number, ad_sets: AdSet[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_API_VERSION = "v24.0";

interface AdSetFromMeta {
  id: string;
  name: string;
  status: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_strategy?: string;
  targeting?: any;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  campaign_id: string; // External ID da campanha no Meta
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
        },
      });
    }

    // Parse request body
    const { campaign_ids, ad_account_ids, since } = await req.json();

    console.log("🔄 sync-ad-sets called with:", {
      campaign_ids,
      ad_account_ids,
      since,
    });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Get campaigns to sync
    let campaignsQuery = supabase
      .from("ad_campaigns")
      .select("id, external_id, ad_account_id, ad_accounts!inner(external_id)");

    if (campaign_ids && campaign_ids.length > 0) {
      campaignsQuery = campaignsQuery.in("id", campaign_ids);
    } else if (ad_account_ids && ad_account_ids.length > 0) {
      campaignsQuery = campaignsQuery.in("ad_account_id", ad_account_ids);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      console.error("❌ Error fetching campaigns:", campaignsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch campaigns", details: campaignsError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      console.warn("⚠️ No campaigns found to sync ad sets");
      return new Response(
        JSON.stringify({ success: true, synced_ad_sets: 0, ad_sets: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Found ${campaigns.length} campaigns to sync ad sets`);

    // Step 2: Get access token
    const { data: connection } = await supabase
      .from("meta_business_connections")
      .select("access_token")
      .eq("is_active", true)
      .limit(1)
      .single();

    let accessToken = connection?.access_token;

    // Fallback to global META_ACCESS_TOKEN if no user token
    if (!accessToken) {
      accessToken = Deno.env.get("META_ACCESS_TOKEN");
      console.log("⚠️ Using global META_ACCESS_TOKEN as fallback");
    }

    if (!accessToken) {
      console.error("❌ No access token available");
      return new Response(
        JSON.stringify({ error: "No Meta access token available" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch ad sets from Meta API for each campaign
    const allAdSets: any[] = [];
    let totalSynced = 0;

    for (const campaign of campaigns) {
      try {
        console.log(`🔍 Fetching ad sets for campaign: ${campaign.external_id}`);

        const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${campaign.external_id}/adsets`;
        const baseParams = new URLSearchParams({
          access_token: accessToken,
          fields: [
            "id",
            "name",
            "status",
            "optimization_goal",
            "billing_event",
            "bid_strategy",
            "targeting",
            "daily_budget",
            "lifetime_budget",
            "start_time",
            "end_time",
            "campaign_id",
          ].join(","),
          limit: "100",
        });

        if (since) baseParams.append("since", since);

        // Try with user token first, then fallback to META_ACCESS_TOKEN if available
        const buildUrl = (token: string) => {
          const p = new URLSearchParams(baseParams);
          p.set("access_token", token);
          return `${metaUrl}?${p.toString()}`;
        };

        const fallbackToken = Deno.env.get("META_ACCESS_TOKEN");
        let firstUrl = buildUrl(accessToken);
        let res = await fetch(firstUrl);
        if (!res.ok && fallbackToken && fallbackToken !== accessToken) {
          console.warn(`⚠️ Primary token failed for campaign ${campaign.external_id} (status ${res.status}). Retrying with META_ACCESS_TOKEN.`);
          firstUrl = buildUrl(fallbackToken);
          res = await fetch(firstUrl);
        }
        if (!res.ok) {
          const errorData = await res.text();
          console.error(`❌ Meta API error for campaign ${campaign.external_id}:`, errorData);
          continue;
        }

        const firstData = await res.json();
        const adSets: AdSetFromMeta[] = (firstData?.data || []).slice();

        // Pagination: follow paging.next if present
        let nextUrl: string | null = firstData?.paging?.next || null;
        while (nextUrl) {
          const pageRes = await fetch(nextUrl);
          if (!pageRes.ok) {
            console.warn(`⚠️ Paging request failed for campaign ${campaign.external_id} (status ${pageRes.status}). Stopping pagination.`);
            break;
          }
          const pageData = await pageRes.json();
          if (Array.isArray(pageData?.data)) adSets.push(...pageData.data);
          nextUrl = pageData?.paging?.next || null;
        }

        console.log(`✅ Found ${adSets.length} ad sets for campaign ${campaign.external_id}`);

        // Step 4: Upsert ad sets to database
        for (const adSet of adSets) {
          const adSetData = {
            external_id: adSet.id,
            campaign_id: campaign.id, // Internal campaign ID
            name: adSet.name,
            status: adSet.status,
            optimization_goal: adSet.optimization_goal || null,
            billing_event: adSet.billing_event || null,
            bid_strategy: adSet.bid_strategy || null,
            targeting: adSet.targeting || null,
            daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null, // Meta returns cents
            lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
            start_time: adSet.start_time || null,
            end_time: adSet.end_time || null,
          };

          const { error: upsertError } = await supabase
            .from("ad_sets")
            .upsert(adSetData, {
              onConflict: "external_id",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error(`❌ Error upserting ad set ${adSet.id}:`, upsertError);
          } else {
            allAdSets.push(adSetData);
            totalSynced++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign.external_id}:`, error);
        continue;
      }
    }

    console.log(`✅ Sync completed: ${totalSynced} ad sets synced`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_ad_sets: totalSynced,
        campaigns_processed: campaigns.length,
        ad_sets: allAdSets,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
