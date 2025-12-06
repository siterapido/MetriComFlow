import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Shared helpers for Meta Ads synchronization (ad sets + creatives)

export const META_API_VERSION = "v24.0";

export type SupabaseClient = any;

export function normalizeMetaPaging(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

export async function fetchWithBackoff(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < tries) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const waitMs = 500 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    attempt++;
  }
  return fetch(url, init);
}

export function tsOrNull(v: unknown): string | null {
  if (!v) return null;
  const s = typeof v === "string" ? v : String(v);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function budgetToDecimal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return null;
  return n / 100; // Meta retorna em unidades menores (centavos)
}

export async function resolveAccessToken(
  supabase: SupabaseClient,
  connectedBy?: string | null,
  cache?: Map<string, string | null>,
): Promise<string | null> {
  const key = connectedBy || "__default__";
  if (cache && cache.has(key)) {
    return cache.get(key) ?? null;
  }

  let token: string | null = null;

  if (connectedBy) {
    const { data, error } = await supabase
      .from("meta_business_connections")
      .select("access_token, connected_at")
      .eq("user_id", connectedBy)
      .eq("is_active", true)
      .order("connected_at", { ascending: false })
      .limit(1);

    if (!error && data && data[0]?.access_token) {
      token = data[0].access_token as string;
    }
  }

  if (!token) {
    token = Deno.env.get("META_ACCESS_TOKEN") ?? null;
  }

  if (cache) {
    cache.set(key, token);
  }

  return token;
}

export function detectCreativeType(oss: any): string | null {
  if (!oss) return null;
  if (oss.video_data) return "VIDEO";
  if (oss.carousel_data) return "CAROUSEL";
  if (oss.link_data) return "IMAGE";
  if (oss.collection_data) return "COLLECTION";
  if (oss.photo_data) return "PHOTO";
  if (oss.text_data) return "TEXT";
  return null;
}

export function extractImageUrl(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.image_url) return String(oss.link_data.image_url);
  const att = oss.carousel_data?.child_attachments;
  if (Array.isArray(att) && att[0]?.image_url) return String(att[0].image_url);
  if (oss.photo_data?.url) return String(oss.photo_data.url);
  if (oss.video_data?.image_url) return String(oss.video_data.image_url);
  return null;
}

export function extractVideoUrl(oss: any): string | null {
  if (!oss) return null;
  if (oss.video_data?.video_url) return String(oss.video_data.video_url);
  if (oss.video_data?.video_id) return String(oss.video_data.video_id);
  return null;
}

export function extractTitle(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.name) return String(oss.link_data.name);
  const att = oss.carousel_data?.child_attachments;
  if (Array.isArray(att) && att[0]?.name) return String(att[0].name);
  if (oss.carousel_data?.name) return String(oss.carousel_data.name);
  if (oss.collection_data?.name) return String(oss.collection_data.name);
  if (oss.video_data?.title) return String(oss.video_data.title);
  return null;
}

export function extractBody(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.message) return String(oss.link_data.message);
  if (oss.video_data?.message) return String(oss.video_data.message);
  if (oss.carousel_data?.message) return String(oss.carousel_data.message);
  if (oss.photo_data?.caption) return String(oss.photo_data.caption);
  if (oss.text_data?.message) return String(oss.text_data.message);
  return null;
}

export function extractCTA(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.call_to_action?.type) return String(oss.link_data.call_to_action.type);
  if (oss.video_data?.call_to_action?.type) return String(oss.video_data.call_to_action.type);
  if (oss.carousel_data?.call_to_action?.type) return String(oss.carousel_data.call_to_action.type);
  if (oss.collection_data?.call_to_action?.type) return String(oss.collection_data.call_to_action.type);
  return null;
}

export function extractLinkUrl(oss: any): string | null {
  if (!oss) return null;
  if (oss.link_data?.link) return String(oss.link_data.link);
  if (oss.link_data?.call_to_action?.value?.link_url) return String(oss.link_data.call_to_action.value.link_url);
  if (oss.video_data?.link) return String(oss.video_data.link);
  if (oss.video_data?.call_to_action?.value?.link_url) return String(oss.video_data.call_to_action.value.link_url);
  if (oss.carousel_data?.link) return String(oss.carousel_data.link);
  if (oss.carousel_data?.call_to_action?.value?.link_url) return String(oss.carousel_data.call_to_action.value.link_url);
  if (oss.collection_data?.link) return String(oss.collection_data.link);
  return null;
}

export function mapAdSetRecord(adset: any, campaignId: string) {
  return {
    external_id: String(adset.id),
    campaign_id: campaignId,
    name: adset.name ?? "",
    status: adset.status ?? null,
    optimization_goal: adset.optimization_goal ?? null,
    billing_event: adset.billing_event ?? null,
    bid_strategy: adset.bid_strategy ?? null,
    targeting: adset.targeting ?? null,
    daily_budget: budgetToDecimal(adset.daily_budget),
    lifetime_budget: budgetToDecimal(adset.lifetime_budget),
    start_time: tsOrNull(adset.start_time),
    end_time: tsOrNull(adset.end_time),
    updated_at: new Date().toISOString(),
  };
}

export function mapAdRecord(ad: any, adSetInternalId: string, campaignId: string) {
  const creative = ad.creative ?? {};
  const oss = creative.object_story_spec ?? {};
  const afs = creative.asset_feed_spec ?? ad.asset_feed_spec ?? {};

  let creativeType = detectCreativeType(oss) || "UNKNOWN";
  let title = extractTitle(oss);
  let body = extractBody(oss);
  let callToAction = extractCTA(oss);
  let linkUrl = extractLinkUrl(oss);
  let imageUrl = creative.thumbnail_url ?? extractImageUrl(oss);
  let videoUrl = extractVideoUrl(oss);
  let thumbnailUrl = creative.thumbnail_url ?? null;

  if (afs && (afs.images || afs.videos || afs.bodies || afs.titles)) {
    creativeType = "DYNAMIC_CREATIVE";
    if (afs.titles?.[0]?.text) title = afs.titles[0].text;
    if (afs.bodies?.[0]?.text) body = afs.bodies[0].text;
    if (afs.link_urls?.[0]?.website_url) linkUrl = afs.link_urls[0].website_url;
    if (afs.call_to_action_types?.[0]) callToAction = afs.call_to_action_types[0];
    if (afs.images?.[0]?.url) {
      imageUrl = afs.images[0].url;
      thumbnailUrl = afs.images[0].url;
    } else if (afs.videos?.[0]) {
      videoUrl = afs.videos[0].video_id ?? videoUrl;
      thumbnailUrl = afs.videos[0].thumbnail_url ?? thumbnailUrl;
    }
  } else if (oss.carousel_data) {
    creativeType = "CAROUSEL";
    const carouselData = oss.carousel_data;
    const firstChild = carouselData.child_attachments?.[0];
    if (firstChild) {
      title = firstChild.name || carouselData.name || title;
      body = firstChild.description || carouselData.message || body;
      callToAction = firstChild.call_to_action?.type || carouselData.call_to_action?.type || callToAction;
      linkUrl = firstChild.link || carouselData.link || linkUrl;
      imageUrl = imageUrl || firstChild.image_url || firstChild.picture || null;
      thumbnailUrl = thumbnailUrl || firstChild.image_url || firstChild.picture || null;
    } else {
      title = carouselData.name || title;
      body = carouselData.message || body;
      callToAction = carouselData.call_to_action?.type || callToAction;
      linkUrl = carouselData.link || linkUrl;
    }
  } else if (oss.collection_data) {
    creativeType = "COLLECTION";
    const collectionData = oss.collection_data;
    title = collectionData.name || title;
    body = collectionData.description || body;
    callToAction = collectionData.call_to_action?.type || callToAction;
    linkUrl = collectionData.link || linkUrl;
    imageUrl = imageUrl || collectionData.cover_image_url || null;
    thumbnailUrl = thumbnailUrl || collectionData.cover_image_url || null;
  } else if (oss.link_data) {
    creativeType = "IMAGE";
    const linkData = oss.link_data;
    title = linkData.name || title;
    body = linkData.message || body;
    callToAction = linkData.call_to_action?.type || callToAction;
    linkUrl = linkData.link || linkUrl;
    imageUrl = imageUrl || linkData.picture || linkData.image_url || null;
  } else if (oss.video_data) {
    creativeType = "VIDEO";
    const videoData = oss.video_data;
    title = videoData.title || title;
    body = videoData.message || body;
    callToAction = videoData.call_to_action?.type || callToAction;
    linkUrl = videoData.link || linkUrl;
    videoUrl = videoData.video_id || videoUrl;
    imageUrl = imageUrl || videoData.image_url || null;
    thumbnailUrl = thumbnailUrl || videoData.image_url || null;
  } else if (oss.photo_data) {
    creativeType = "PHOTO";
    const photoData = oss.photo_data;
    body = photoData.caption || body;
    imageUrl = imageUrl || photoData.url || null;
  } else if (oss.text_data) {
    creativeType = "TEXT";
    body = oss.text_data?.message || body;
  }

  if (!linkUrl) {
    linkUrl = extractLinkUrl(oss);
  }

  return {
    external_id: String(ad.id),
    ad_set_id: adSetInternalId,
    campaign_id: campaignId,
    name: ad.name ?? "",
    status: ad.status ?? null,
    creative_id: creative.id || null,
    creative_type: creativeType ?? null,
    title: title ?? null,
    body: body ?? null,
    call_to_action: callToAction ?? null,
    link_url: linkUrl ?? null,
    image_url: imageUrl ?? null,
    video_url: videoUrl ?? null,
    thumbnail_url: thumbnailUrl ?? null,
    creative_data: creative || oss || null,
    asset_feed_spec: afs && Object.keys(afs).length ? afs : null,
    created_time: tsOrNull(ad.created_time),
    updated_time: tsOrNull(ad.updated_time),
    updated_at: new Date().toISOString(),
  };
}
