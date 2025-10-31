import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ConversionRequest {
  eventName?: string; // default: "Lead"
  eventId?: string | null; // dedup key, e.g., submission id
  eventTime?: number | null; // unix seconds; default now
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  userAgent?: string | null;
  url?: string | null; // event source URL
  formId?: string | null;
  campaign?: {
    meta_ad_account_id?: string | null;
    meta_campaign_id?: string | null;
    meta_adset_id?: string | null;
    meta_ad_id?: string | null;
  } | null;
}

function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(input)).then((buf) => {
    const bytes = new Uint8Array(buf);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

function cors(headers: HeadersInit = {}): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
  const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
  const META_TEST_EVENT_CODE = Deno.env.get("META_TEST_EVENT_CODE");

  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing META_PIXEL_ID or META_ACCESS_TOKEN" }), {
      status: 500,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  let body: ConversionRequest;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  const eventName = body.eventName || "Lead";
  const eventId = body.eventId || undefined;
  const ts = Math.floor((body.eventTime || Date.now() / 1000) as number);

  // Build user_data per CAPI spec (hashed lowercase email/phone)
  const userData: Record<string, unknown> = {};
  if (body.email && typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    userData.em = [await sha256Hex(email)];
  }
  if (body.phone && typeof body.phone === "string") {
    const digits = body.phone.replace(/\D+/g, "");
    if (digits.length >= 8) {
      userData.ph = [await sha256Hex(digits)];
    }
  }
  if (body.fbp) userData.fbp = body.fbp;
  if (body.fbc) userData.fbc = body.fbc;
  if (body.clientIpAddress) userData.client_ip_address = body.clientIpAddress;
  if (body.userAgent) userData.client_user_agent = body.userAgent;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: ts,
        event_id: eventId,
        action_source: "website",
        event_source_url: body.url || undefined,
        user_data: userData,
        custom_data: {
          value: 0,
          currency: "BRL",
          form_id: body.formId || undefined,
          meta_campaign_id: body.campaign?.meta_campaign_id || undefined,
          meta_adset_id: body.campaign?.meta_adset_id || undefined,
          meta_ad_id: body.campaign?.meta_ad_id || undefined,
        },
      },
    ],
    access_token: META_ACCESS_TOKEN,
    test_event_code: META_TEST_EVENT_CODE || undefined,
  };

  const url = `https://graph.facebook.com/v24.0/${META_PIXEL_ID}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: cors({ "Content-Type": "application/json" }),
  });
});

