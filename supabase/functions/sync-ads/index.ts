import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  META_API_VERSION,
  fetchWithBackoff,
  mapAdRecord,
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

    // Parse request body
    const { ad_set_ids, campaign_ids, ad_account_ids, since } = await req.json();

    console.log("🔄 sync-ads called with:", {
      ad_set_ids,
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

    // Step 1: Get ad sets to sync (including owning user for token resolution)
    let adSetsQuery = supabase
      .from("ad_sets")
      .select("id, external_id, campaign_id, ad_campaigns!inner(ad_account_id, ad_accounts!inner(connected_by, provider, is_active))");

    if (ad_set_ids && ad_set_ids.length > 0) {
      adSetsQuery = adSetsQuery.in("id", ad_set_ids);
    } else if (campaign_ids && campaign_ids.length > 0) {
      adSetsQuery = adSetsQuery.in("campaign_id", campaign_ids);
    } else if (ad_account_ids && ad_account_ids.length > 0) {
      // Need to join with campaigns to get ad sets from specific accounts
      const { data: campaigns } = await supabase
        .from("ad_campaigns")
        .select("id")
        .in("ad_account_id", ad_account_ids);

      const campaignIds = campaigns?.map((c) => c.id) || [];
      if (campaignIds.length > 0) {
        adSetsQuery = adSetsQuery.in("campaign_id", campaignIds);
      }
    }

    // Apenas contas Meta ativas
    adSetsQuery = adSetsQuery.eq("ad_campaigns.ad_accounts.provider", "meta").eq("ad_campaigns.ad_accounts.is_active", true);

    const { data: adSets, error: adSetsError } = await adSetsQuery;

    if (adSetsError) {
      console.error("❌ Error fetching ad sets:", adSetsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch ad sets", details: adSetsError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!adSets || adSets.length === 0) {
      console.warn("⚠️ No ad sets found to sync ads");
      return new Response(
        JSON.stringify({ success: true, synced_ads: 0, ads: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Found ${adSets.length} ad sets to sync ads`);

    // Step 2: Fetch ads from Meta API for each ad set
    const allAds: any[] = [];
    const errors: string[] = [];
    let totalSynced = 0;
    const tokenCache = new Map<string, string | null>();

    for (const adSet of adSets) {
      const accountInfo = (adSet as any)?.ad_campaigns?.ad_accounts;
      const connectedBy = Array.isArray(accountInfo) ? accountInfo[0]?.connected_by : accountInfo?.connected_by;
      const token = await resolveAccessToken(supabase, connectedBy, tokenCache);
      if (!token) {
        errors.push(`No Meta token for ad set ${adSet.id}`);
        continue;
      }

      try {
        console.log(`🔍 Fetching ads for ad set: ${adSet.external_id}`);

        const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${adSet.external_id}/ads`;
        const baseParams = new URLSearchParams({
          access_token: token,
          fields: [
            "id",
            "name",
            "status",
            "adset_id",
            "campaign_id",
            "creative{id,image_url,thumbnail_url,object_story_spec,asset_feed_spec}",
            "created_time",
            "updated_time",
          ].join(","),
          limit: "100",
        });

        if (since) baseParams.append("since", since);

        const res = await fetchWithBackoff(`${metaUrl}?${baseParams.toString()}`, { method: "GET" });
        if (!res.ok) {
          const errorData = await res.text();
          console.error(`❌ Meta API error for ad set ${adSet.external_id}:`, errorData);
          errors.push(`Meta error for ad set ${adSet.external_id}: ${res.status}`);
          continue;
        }

        const firstData = await res.json();
        const ads = normalizeMetaPaging(firstData);

        // Pagination
        let nextUrl: string | null = firstData?.paging?.next || null;
        while (nextUrl) {
          const pageRes = await fetchWithBackoff(nextUrl, { method: "GET" });
          if (!pageRes.ok) {
            console.warn(`⚠️ Paging request failed for ad set ${adSet.external_id} (status ${pageRes.status}). Stopping pagination.`);
            break;
          }
          const pageData = await pageRes.json();
          ads.push(...normalizeMetaPaging(pageData));
          nextUrl = pageData?.paging?.next || null;
        }

        console.log(`✅ Found ${ads.length} ads for ad set ${adSet.external_id}`);

        const adRecords = ads.map((ad) => mapAdRecord(ad, adSet.id, adSet.campaign_id));

        if (adRecords.length > 0) {
          const { error: upsertError, data } = await supabase
            .from("ads")
            .upsert(adRecords, { onConflict: "external_id" })
            .select("external_id");

          if (upsertError) {
            console.error(`❌ Error upserting ads for ad set ${adSet.external_id}:`, upsertError);
            errors.push(`DB error for ad set ${adSet.external_id}`);
          } else {
            allAds.push(...adRecords);
            totalSynced += data?.length || adRecords.length;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ad set ${adSet.external_id}:`, error);
        errors.push(`Unexpected error for ad set ${adSet.external_id}`);
        continue;
      }
    }

    console.log(`✅ Sync completed: ${totalSynced} ads synced`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        synced_ads: totalSynced,
        ad_sets_processed: adSets.length,
        ads: allAds,
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
