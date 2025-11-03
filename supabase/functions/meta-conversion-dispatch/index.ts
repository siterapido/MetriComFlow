/**
 * Meta Conversions API (CAPI) Dispatcher
 *
 * Sends conversion events (Lead, Purchase) back to Meta Ads to optimize campaigns.
 * Processes pending events from meta_conversion_events table.
 *
 * Invocation:
 * 1. Manual: POST with {event_id, process_all, test_event_code}
 * 2. Cron: Scheduled to process all pending events
 * 3. Trigger: Real-time after lead status change
 * 4. Direct: POST with event data (backward compatibility)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GRAPH_API_VERSION = "v24.0";
const MAX_EVENTS_PER_BATCH = 1000; // Meta API limit

interface ConversionEvent {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  event_name: string;
  event_time: number;
  value: number | null;
  currency: string;
  content_ids: string[];
  fbclid: string | null;
  status: string;
  retry_count: number;
  max_retries: number;
  organization_id: string;
}

interface Lead {
  email: string | null;
  phone: string | null;
  name: string | null;
  fbclid: string | null;
}

/**
 * SHA-256 hash for PII normalization (Meta requirement)
 */
async function sha256Hash(value: string | null): Promise<string | null> {
  if (!value || !value.trim()) return null;

  // Normalize: lowercase + trim
  const normalized = value.toLowerCase().trim();

  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Extract first and last name from full name
 */
function parseFullName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName || !fullName.trim()) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts[parts.length - 1] : null;

  return { firstName, lastName };
}

/**
 * Send event to Meta Conversions API
 */
async function sendToMetaCAPI(params: {
  pixelId: string;
  accessToken: string;
  event: ConversionEvent;
  lead: Lead;
  testEventCode?: string;
}): Promise<{ success: boolean; response?: any; error?: string }> {
  const { pixelId, accessToken, event, lead, testEventCode } = params;

  try {
    // Hash PII
    const emailHash = await sha256Hash(lead.email);
    const phoneHash = await sha256Hash(lead.phone?.replace(/\D/g, "")); // Remove non-digits
    const { firstName, lastName } = parseFullName(lead.name);
    const firstNameHash = await sha256Hash(firstName);
    const lastNameHash = await sha256Hash(lastName);

    // Build event payload
    const eventPayload = {
      event_name: event.event_name,
      event_time: event.event_time,
      action_source: "crm", // Required: source of conversion
      user_data: {
        em: emailHash ? [emailHash] : undefined, // Email hash
        ph: phoneHash ? [phoneHash] : undefined, // Phone hash
        fn: firstNameHash ? [firstNameHash] : undefined, // First name hash
        ln: lastNameHash ? [lastNameHash] : undefined, // Last name hash
        fbc: lead.fbclid ? `fb.1.${event.event_time}.${lead.fbclid}` : undefined, // Facebook Click ID
      },
      custom_data: {
        currency: event.currency,
        value: event.value || undefined,
        content_ids: event.content_ids.length > 0 ? event.content_ids : undefined,
      },
    };

    // Remove undefined fields
    const cleanPayload = JSON.parse(JSON.stringify(eventPayload));

    console.log(`[CAPI] Sending event ${event.id} (${event.event_name}) to Pixel ${pixelId}`);

    // Send to Meta Conversions API
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;
    const body: any = {
      data: [cleanPayload],
      access_token: accessToken,
    };

    // Test event code (for Meta Events Manager testing)
    if (testEventCode) {
      body.test_event_code = testEventCode;
      console.log(`[CAPI] Using test event code: ${testEventCode}`);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`[CAPI] Error response from Meta:`, responseData);
      return {
        success: false,
        error: responseData.error?.message || JSON.stringify(responseData),
        response: responseData,
      };
    }

    console.log(`[CAPI] Success:`, responseData);

    return {
      success: true,
      response: responseData,
    };
  } catch (error) {
    console.error(`[CAPI] Exception:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function cors(headers: HeadersInit = {}): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  };
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const { event_id, process_all, test_event_code } = await req.json().catch(() => ({}));

    console.log(`[CAPI] Invoked with:`, { event_id, process_all, test_event_code });

    // Query pending events
    let query = supabase
      .from("meta_conversion_events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(MAX_EVENTS_PER_BATCH);

    if (event_id) {
      query = query.eq("id", event_id);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      throw eventsError;
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending events to process", processed: 0 }),
        { headers: cors({ "Content-Type": "application/json" }), status: 200 }
      );
    }

    console.log(`[CAPI] Found ${events.length} pending events`);

    const results: Array<{ event_id: string; status: string; error?: string }> = [];

    for (const event of events as ConversionEvent[]) {
      try {
        // Get lead data
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .select("email, phone, name, fbclid")
          .eq("id", event.lead_id)
          .single();

        if (leadError || !lead) {
          console.error(`[CAPI] Lead not found: ${event.lead_id}`);
          await supabase
            .from("meta_conversion_events")
            .update({
              status: "failed",
              error_message: "Lead not found",
              retry_count: event.retry_count + 1,
            })
            .eq("id", event.id);

          results.push({ event_id: event.id, status: "failed", error: "Lead not found" });
          continue;
        }

        // Get Pixel ID and Access Token
        let pixelId: string | null = Deno.env.get("META_PIXEL_ID") || null;
        let accessToken: string | null = Deno.env.get("META_ACCESS_TOKEN") || null;

        // Try to get from organization's Meta connection (if available)
        if (event.organization_id) {
          const { data: connection } = await supabase
            .from("meta_business_connections")
            .select("access_token, meta_pixel_id")
            .eq("organization_id", event.organization_id)
            .eq("is_active", true)
            .single();

          if (connection && (connection as any).meta_pixel_id) {
            pixelId = (connection as any).meta_pixel_id;
            accessToken = connection.access_token;
          }
        }

        if (!pixelId || !accessToken) {
          console.warn(`[CAPI] No Pixel ID or Access Token for event ${event.id}`);
          await supabase
            .from("meta_conversion_events")
            .update({
              status: "failed",
              error_message: "No Meta Pixel ID or Access Token configured",
              retry_count: event.retry_count + 1,
            })
            .eq("id", event.id);

          results.push({
            event_id: event.id,
            status: "failed",
            error: "No Pixel ID or Access Token",
          });
          continue;
        }

        // Send to Meta CAPI
        const result = await sendToMetaCAPI({
          pixelId,
          accessToken,
          event,
          lead: lead as Lead,
          testEventCode: test_event_code,
        });

        if (result.success) {
          // Mark as sent
          await supabase
            .from("meta_conversion_events")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              response_data: result.response,
            })
            .eq("id", event.id);

          results.push({ event_id: event.id, status: "sent" });
        } else {
          // Mark as failed
          await supabase
            .from("meta_conversion_events")
            .update({
              status: "failed",
              error_message: result.error,
              retry_count: event.retry_count + 1,
              response_data: result.response,
            })
            .eq("id", event.id);

          results.push({ event_id: event.id, status: "failed", error: result.error });
        }
      } catch (error) {
        console.error(`[CAPI] Error processing event ${event.id}:`, error);

        await supabase
          .from("meta_conversion_events")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : String(error),
            retry_count: event.retry_count + 1,
          })
          .eq("id", event.id);

        results.push({
          event_id: event.id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        message: "Conversion events processed",
        processed: results.length,
        success: successCount,
        failed: failedCount,
        results,
      }),
      {
        headers: cors({ "Content-Type": "application/json" }),
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CAPI] Fatal error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: cors({ "Content-Type": "application/json" }),
        status: 500,
      }
    );
  }
});
