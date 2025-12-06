import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  META_API_VERSION,
  fetchWithBackoff,
  mapAdSetRecord,
  normalizeMetaPaging,
  resolveAccessToken,
} from "../_shared/meta-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { campaign_ids, ad_account_ids, since } = await req.json();
    console.log("🔄 sync-ad-sets called with:", { campaign_ids, ad_account_ids, since });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Get campaigns (with owner of each ad account for token resolution)
    let campaignsQuery = supabase
      .from("ad_campaigns")
      .select("id, external_id, ad_account_id, ad_accounts!inner(external_id, connected_by, provider, is_active)");

    if (campaign_ids && campaign_ids.length > 0) {
      campaignsQuery = campaignsQuery.in("id", campaign_ids);
    } else if (ad_account_ids && ad_account_ids.length > 0) {
      campaignsQuery = campaignsQuery.in("ad_account_id", ad_account_ids);
    }

    // Apenas contas Meta ativas
    campaignsQuery = campaignsQuery.eq("ad_accounts.provider", "meta").eq("ad_accounts.is_active", true);

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

    const tokenCache = new Map<string, string | null>();
    const allAdSets: any[] = [];
    const errors: string[] = [];
    let totalSynced = 0;

    for (const campaign of campaigns) {
      const connectedBy = (campaign as any)?.ad_accounts?.connected_by ?? null;
      const token = await resolveAccessToken(supabase, connectedBy, tokenCache);
      if (!token) {
        errors.push(`No Meta token for campaign ${campaign.id} (account ${campaign.ad_account_id})`);
        continue;
      }

      if (!campaign.external_id) {
        errors.push(`Campaign ${campaign.id} missing external_id`);
        continue;
      }

      try {
        console.log(`🔍 Fetching ad sets for campaign: ${campaign.external_id}`);

        const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${campaign.external_id}/adsets`;
        const baseParams = new URLSearchParams({
          access_token: token,
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

        const res = await fetchWithBackoff(`${metaUrl}?${baseParams.toString()}`, { method: "GET" });
        if (!res.ok) {
          const raw = await res.text();
          console.error(`❌ Meta API error for campaign ${campaign.external_id}:`, raw);
          errors.push(`Meta error for campaign ${campaign.external_id}: ${res.status}`);
          continue;
        }

        const firstData = await res.json();
        const adSets = normalizeMetaPaging(firstData);

        // Pagination
        let nextUrl: string | null = firstData?.paging?.next || null;
        while (nextUrl) {
          const pageRes = await fetchWithBackoff(nextUrl, { method: "GET" });
          if (!pageRes.ok) {
            console.warn(`⚠️ Paging failed for campaign ${campaign.external_id} (status ${pageRes.status}).`);
            break;
          }
          const pageData = await pageRes.json();
          adSets.push(...normalizeMetaPaging(pageData));
          nextUrl = pageData?.paging?.next || null;
        }

        console.log(`✅ Found ${adSets.length} ad sets for campaign ${campaign.external_id}`);

        const adSetRecords = adSets.map((adset) => mapAdSetRecord(adset, campaign.id));
        if (adSetRecords.length > 0) {
          const { data, error: upsertError } = await supabase
            .from("ad_sets")
            .upsert(adSetRecords, { onConflict: "external_id" })
            .select("id, external_id");

          if (upsertError) {
            console.error(`❌ Error upserting ad sets for campaign ${campaign.external_id}:`, upsertError);
            errors.push(`DB error for campaign ${campaign.external_id}`);
          } else {
            allAdSets.push(...adSetRecords);
            totalSynced += data?.length || adSetRecords.length;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign.external_id}:`, error);
        errors.push(`Unexpected error for campaign ${campaign.external_id}`);
        continue;
      }
    }

    console.log(`✅ Sync completed: ${totalSynced} ad sets synced`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        synced_ad_sets: totalSynced,
        campaigns_processed: campaigns.length,
        ad_sets: allAdSets,
        errors,
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
