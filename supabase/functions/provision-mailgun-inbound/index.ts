import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// dynamic import to keep editor resolution happy
async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

interface ProvisionResponse {
  inboundEmail: string;
  routeId?: string;
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

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    const MAILGUN_API_BASE = Deno.env.get("MAILGUN_API_BASE_URL") || "https://api.mailgun.net/v3";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Missing Supabase envs" }, 500);
    }

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      return json({ error: "Missing Mailgun envs (MAILGUN_API_KEY, MAILGUN_DOMAIN)" }, 500);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate user and active organization
    const { data: userRes, error: userErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (userErr || !userRes?.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const { data: membership, error: memErr } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, organizations(id, name, slug)")
      .eq("profile_id", userRes.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (memErr || !membership?.organization_id) {
      return json({ error: "No active organization" }, 400);
    }

    // Only owners/admins can provision
    const role = (membership.role || "member").toString();
    if (!["owner", "admin"].includes(role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const orgId = membership.organization_id as string;
    const orgName = (membership as any).organizations?.name as string | undefined;
    let orgSlug = (membership as any).organizations?.slug as string | null;
    if (!orgSlug && orgName) {
      orgSlug = toSlug(orgName);
    }
    if (!orgSlug) {
      orgSlug = orgId.slice(0, 8);
    }

    // Compute inbound email address and route expression
    const inboundEmail = `${orgSlug}@${MAILGUN_DOMAIN}`;
    const expression = `match_recipient('${inboundEmail}')`;

    // Mailgun route target: Supabase functions public endpoint
    const inboundUrl = `${SUPABASE_URL}/functions/v1/mailgun-inbound`;
    const actions = [
      `forward('${inboundUrl}')`,
      "stop()",
    ];

    // Create route (idempotent attempt: try create; ignore duplicate errors)
    const authHeader = "Basic " + btoa(`api:${MAILGUN_API_KEY}`);
    // Mailgun Routes API expects form-urlencoded
    const form = new URLSearchParams();
    form.set("priority", String(0));
    form.set("description", `Insightfy inbound for org ${orgSlug}`);
    form.set("expression", expression);
    for (const a of actions) form.append("action", a);

    const createRes = await fetch(`${MAILGUN_API_BASE}/routes`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    let routeId: string | undefined;
    if (createRes.ok) {
      const data = await createRes.json();
      routeId = data?.route?.id || data?.id || undefined;
    } else {
      const errTxt = await createRes.text();
      // If route exists or domain restricted, proceed anyway and only return email
      console.warn("[ProvisionMailgun] Route create failed", createRes.status, errTxt);
    }

    // Persist computed inbound address in organization metadata (best-effort)
    try {
      await supabase
        .from("organizations")
        .update({ metadata: { inbound_email: inboundEmail } as any })
        .eq("id", orgId);
    } catch (_e) {
      // ignore
    }

    const response: ProvisionResponse = { inboundEmail, routeId };
    return json({ ok: true, ...response });
  } catch (e) {
    console.error("[ProvisionMailgun] Unhandled error", e);
    return json({ error: "Unhandled error" }, 500);
  }
});
