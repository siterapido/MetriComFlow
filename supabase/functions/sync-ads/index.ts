// Edge Function: sync-ads
// Description: Sincroniza anúncios/criativos (ads) do Meta Ads para o banco de dados
// Method: POST
// Auth: Required (service_role or authenticated user)
//
// Body Parameters:
// - ad_set_ids: string[] (opcional) - IDs internos dos ad sets para sincronizar
// - campaign_ids: string[] (opcional) - IDs internos das campanhas para sincronizar todos os ad sets
// - ad_account_ids: string[] (opcional) - IDs internos das contas para sincronizar tudo
// - since: string (opcional) - Data inicial para filtrar ads ativos
//
// Returns: { success: boolean, synced_ads: number, ads: Ad[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_API_VERSION = "v24.0";

interface AdFromMeta {
  id: string;
  name: string;
  status: string;
  adset_id: string; // External ID do ad set no Meta
  campaign_id: string; // External ID da campanha no Meta
  creative?: {
    id?: string;
    object_story_spec?: {
      link_data?: {
        message?: string;
        name?: string;
        call_to_action?: { type?: string };
        link?: string;
        picture?: string;
      };
      video_data?: {
        message?: string;
        title?: string;
        call_to_action?: { type?: string };
        link?: string;
        video_id?: string;
        image_url?: string;
      };
    };
    image_url?: string;
    thumbnail_url?: string;
  };
  created_time?: string;
  updated_time?: string;
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

    // Step 1: Get ad sets to sync
    let adSetsQuery = supabase
      .from("ad_sets")
      .select("id, external_id, campaign_id");

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

    // Step 2: Get access token
    const { data: connection } = await supabase
      .from("meta_business_connections")
      .select("access_token")
      .eq("is_active", true)
      .limit(1)
      .single();

    let accessToken = connection?.access_token;

    // Fallback to global META_ACCESS_TOKEN
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

    // Step 3: Fetch ads from Meta API for each ad set
    const allAds: any[] = [];
    let totalSynced = 0;

    for (const adSet of adSets) {
      try {
        console.log(`🔍 Fetching ads for ad set: ${adSet.external_id}`);

        const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${adSet.external_id}/ads`;
        const baseParams = new URLSearchParams({
          access_token: accessToken,
          fields: [
            "id",
            "name",
            "status",
            "adset_id",
            "campaign_id",
            "creative{id,image_url,thumbnail_url,object_story_spec}",
            "created_time",
            "updated_time",
          ].join(","),
          limit: "100",
        });

        if (since) baseParams.append("since", since);

        // Build and fetch with fallback token if needed
        const buildUrl = (token: string) => {
          const p = new URLSearchParams(baseParams);
          p.set("access_token", token);
          return `${metaUrl}?${p.toString()}`;
        };

        const fallbackToken = Deno.env.get("META_ACCESS_TOKEN");
        let firstUrl = buildUrl(accessToken);
        let res = await fetch(firstUrl);
        if (!res.ok && fallbackToken && fallbackToken !== accessToken) {
          console.warn(`⚠️ Primary token failed for ad set ${adSet.external_id} (status ${res.status}). Retrying with META_ACCESS_TOKEN.`);
          firstUrl = buildUrl(fallbackToken);
          res = await fetch(firstUrl);
        }
        if (!res.ok) {
          const errorData = await res.text();
          console.error(`❌ Meta API error for ad set ${adSet.external_id}:`, errorData);
          continue;
        }

        const firstData = await res.json();
        const ads: AdFromMeta[] = (firstData?.data || []).slice();

        // Pagination
        let nextUrl: string | null = firstData?.paging?.next || null;
        while (nextUrl) {
          const pageRes = await fetch(nextUrl);
          if (!pageRes.ok) {
            console.warn(`⚠️ Paging request failed for ad set ${adSet.external_id} (status ${pageRes.status}). Stopping pagination.`);
            break;
          }
          const pageData = await pageRes.json();
          if (Array.isArray(pageData?.data)) ads.push(...pageData.data);
          nextUrl = pageData?.paging?.next || null;
        }

        console.log(`✅ Found ${ads.length} ads for ad set ${adSet.external_id}`);

        // Step 4: Upsert ads to database
        for (const ad of ads) {
          // Extract creative data
          const creative = ad.creative;
          let title = null;
          let body = null;
          let callToAction = null;
          let linkUrl = null;
          let imageUrl = creative?.image_url || null;
          let videoUrl = null;
          let thumbnailUrl = creative?.thumbnail_url || null;
          let creativeType = "UNKNOWN";

          if (creative?.object_story_spec?.link_data) {
            const linkData = creative.object_story_spec.link_data;
            title = linkData.name || null;
            body = linkData.message || null;
            callToAction = linkData.call_to_action?.type || null;
            linkUrl = linkData.link || null;
            imageUrl = imageUrl || linkData.picture || null;
            creativeType = "IMAGE";
          } else if (creative?.object_story_spec?.video_data) {
            const videoData = creative.object_story_spec.video_data;
            title = videoData.title || null;
            body = videoData.message || null;
            callToAction = videoData.call_to_action?.type || null;
            linkUrl = videoData.link || null;
            videoUrl = videoData.video_id || null;
            imageUrl = imageUrl || videoData.image_url || null;
            creativeType = "VIDEO";
          }

          const adData = {
            external_id: ad.id,
            ad_set_id: adSet.id, // Internal ad set ID
            campaign_id: adSet.campaign_id, // Internal campaign ID (denormalized)
            name: ad.name,
            status: ad.status,
            creative_id: creative?.id || null,
            creative_type: creativeType,
            title,
            body,
            call_to_action: callToAction,
            link_url: linkUrl,
            image_url: imageUrl,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            creative_data: creative || null, // Store full creative JSON
            created_time: ad.created_time || null,
            updated_time: ad.updated_time || null,
          };

          const { error: upsertError } = await supabase
            .from("ads")
            .upsert(adData, {
              onConflict: "external_id",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error(`❌ Error upserting ad ${ad.id}:`, upsertError);
          } else {
            allAds.push(adData);
            totalSynced++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ad set ${adSet.external_id}:`, error);
        continue;
      }
    }

    console.log(`✅ Sync completed: ${totalSynced} ads synced`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_ads: totalSynced,
        ad_sets_processed: adSets.length,
        ads: allAds,
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
