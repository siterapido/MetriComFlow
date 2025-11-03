import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Mailgun inbound webhook payload fields (subset)
interface MailgunInboundPayload {
  timestamp?: string;
  token?: string;
  signature?: string;
  sender?: string;
  from?: string;
  recipient?: string;
  subject?: string;
  "body-plain"?: string;
  "stripped-text"?: string;
  "stripped-html"?: string;
  domain?: string;
  [key: string]: FormDataEntryValue | undefined;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, enc.encode(data)))
    .then((sig) => Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

async function verifyMailgunSignature(ts?: string, token?: string, sig?: string): Promise<boolean> {
  try {
    const signingKey = Deno.env.get("MAILGUN_SIGNING_KEY");
    if (!signingKey) {
      console.warn("[MailgunInbound] MAILGUN_SIGNING_KEY not set; skipping strict verification");
      return true; // allow processing in dev, but warn
    }
    if (!ts || !token || !sig) {
      console.warn("[MailgunInbound] Missing signature fields");
      return false;
    }
    // Replay protection (default 15 minutes window)
    const now = Math.floor(Date.now() / 1000);
    const tsNum = parseInt(ts, 10);
    if (Number.isFinite(tsNum) && Math.abs(now - tsNum) > 15 * 60) {
      console.warn("[MailgunInbound] Stale timestamp", { ts, now });
      return false;
    }
    const computed = await hmacSha256Hex(signingKey, `${ts}${token}`);
    const ok = computed === sig;
    if (!ok) {
      console.warn("[MailgunInbound] Signature mismatch");
    }
    return ok;
  } catch (e) {
    console.error("[MailgunInbound] Error verifying signature", e);
    return false;
  }
}

function extractLocalPart(email: string | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at === -1) return email.toLowerCase();
  return email.slice(0, at).toLowerCase();
}

function sanitize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function buildLeadTitle(subject: string | null, fromEmail: string | null): string {
  if (subject && subject.length > 0) return subject.slice(0, 120);
  if (fromEmail) return `Contato: ${fromEmail}`.slice(0, 120);
  return "Novo email";
}

function pickBody(payload: MailgunInboundPayload): string {
  const html = sanitize(payload["stripped-html"] as string | undefined);
  const textPlain = sanitize(payload["stripped-text"] as string | undefined) || sanitize(payload["body-plain"] as string | undefined);
  if (html) return html;
  if (textPlain) return textPlain;
  return "(corpo vazio)";
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return text("ok");
  }

  // Only accept POSTs from Mailgun Route forwarding
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Missing Supabase configuration" }, 500);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Parse multipart/form-data sent by Mailgun routes
    const form = await req.formData();
    const payload: MailgunInboundPayload = {};
    for (const [k, v] of form.entries()) {
      payload[k] = v as FormDataEntryValue;
    }

    const timestamp = payload.timestamp as string | undefined;
    const token = payload.token as string | undefined;
    const signature = payload.signature as string | undefined;

    const verified = await verifyMailgunSignature(timestamp, token, signature);
    if (!verified) {
      return json({ error: "Invalid signature" }, 401);
    }

    const sender = sanitize(payload.sender as string | undefined) || sanitize(payload.from as string | undefined);
    const recipient = sanitize(payload.recipient as string | undefined);
    const subject = sanitize(payload.subject as string | undefined);
    const body = pickBody(payload);

    // Determine organization by recipient local-part (org slug or id prefix)
    const local = extractLocalPart(recipient ?? undefined);
    let organizationId: string | null = null;
    let organizationSlug: string | null = null;

    if (local) {
      // Try find by slug first
      const { data: orgBySlug } = await supabase
        .from("organizations")
        .select("id, slug")
        .eq("slug", local)
        .maybeSingle();

      if (orgBySlug) {
        organizationId = orgBySlug.id;
        organizationSlug = orgBySlug.slug;
      } else if (local.length >= 8) {
        // Fallback: match by id prefix (first 8 chars)
        const { data: orgsByPrefix } = await supabase
          .from("organizations")
          .select("id, slug")
          .ilike("id", `${local}%`)
          .limit(1)
          .maybeSingle();
        if (orgsByPrefix) {
          organizationId = orgsByPrefix.id;
          organizationSlug = orgsByPrefix.slug;
        }
      }
    }

    // Create a minimal lead for this inbound email
    const leadTitle = buildLeadTitle(subject, sender);
    const leadDescLines = [
      sender ? `De: ${sender}` : null,
      recipient ? `Para: ${recipient}` : null,
      subject ? `Assunto: ${subject}` : null,
      "",
      body,
    ].filter(Boolean) as string[];

    const leadInsert: Record<string, unknown> = {
      title: leadTitle,
      description: leadDescLines.join("\n"),
      status: "novo_lead",
      value: 0,
    };

    // Attach organization_id when schema supports it (ignore error if column doesn't exist)
    if (organizationId) {
      leadInsert["organization_id"] = organizationId;
    }

    // Insert lead with graceful fallback if org column not present
    let newLead: { id: string; title: string } | null = null;
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from("leads")
        .insert(leadInsert)
        .select("id, title")
        .maybeSingle();
      if (!error) {
        newLead = data as any;
        break;
      }
      const code = (error as any)?.code ?? "";
      const msg = String((error as any)?.message ?? "");
      if (code === "PGRST204" && /'organization_id'/.test(msg)) {
        delete (leadInsert as any)["organization_id"];
        continue;
      }
      console.error("[MailgunInbound] Failed to create lead", { error });
      return json({ error: "Failed to create lead" }, 500);
    }

    const leadId = newLead?.id ?? null;

    // Register interaction (email inbound)
    const interactionInsert: Record<string, unknown> = {
      interaction_type: "email",
      direction: "inbound",
      subject: subject ?? leadTitle,
      content: body,
      lead_id: leadId,
      user_id: null,
      user_name: "Email (Inbound)",
      interaction_date: new Date().toISOString(),
    };

    const { error: intErr } = await supabase.from("interactions").insert(interactionInsert);
    if (intErr) {
      console.error("[MailgunInbound] Failed to insert interaction", { error: intErr, leadId });
    }

    // Audit trail
    try {
      await supabase.from("lead_activity").insert({
        lead_id: leadId,
        lead_title: newLead?.title ?? leadTitle,
        user_id: null,
        user_name: "Mailgun",
        action_type: "created",
        from_status: null,
        to_status: "novo_lead",
        description: `Email recebido${sender ? ` de ${sender}` : ""}${recipient ? ` para ${recipient}` : ""}.`,
      });
    } catch (_e) {
      // best-effort
    }

    return json({ ok: true, leadId, organizationId, organizationSlug });
  } catch (e) {
    console.error("[MailgunInbound] Unhandled error", e);
    return json({ error: "Unhandled error" }, 500);
  }
});
