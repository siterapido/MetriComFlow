export interface FormTrackingData {
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  metaFormId?: string | null;
  metaLeadId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.split("=")[1] ?? "") : null;
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | null {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function parseSearchParams(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function safeReferrer(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const referrer = document.referrer;
  if (!referrer || referrer.length === 0) {
    return null;
  }
  try {
    const url = new URL(referrer);
    // Avoid capturing the same domain as landing page
    if (typeof window !== "undefined" && window.location.host === url.host) {
      return null;
    }
    return referrer;
  } catch (_error) {
    return referrer;
  }
}

export function collectFormTrackingData(): FormTrackingData {
  const params = parseSearchParams();

  const utmSource = params["utm_source"] ?? null;
  const utmMedium = params["utm_medium"] ?? null;
  const utmCampaign = params["utm_campaign"] ?? null;
  const utmContent = params["utm_content"] ?? null;
  const utmTerm = params["utm_term"] ?? null;
  const metaFormId = params["meta_form_id"] ?? params["fb_form_id"] ?? null;
  const metaLeadId = params["meta_lead_id"] ?? params["lead_id"] ?? null;

  // Facebook Click ID from URL parameter or cookie
  const fbclidParam = params["fbclid"] ?? null;
  const fbp = getCookie("_fbp");
  const fbc = fbclidParam || getCookie("_fbc");

  const landingPage =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : null;

  const referrer = safeReferrer();

  let referrerHost: string | null = null;
  if (referrer) {
    try {
      referrerHost = new URL(referrer).host;
    } catch (_error) {
      referrerHost = null;
    }
  }

  const source = pickFirst(params["source"], utmSource, referrerHost);

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  return {
    source,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    metaFormId,
    metaLeadId,
    fbp,
    fbc,
    landingPage,
    referrer,
    userAgent,
  };
}
