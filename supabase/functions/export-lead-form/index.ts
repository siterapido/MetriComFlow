import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Lightweight dynamic import to avoid editor issues
async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

interface ExportRequest {
  formId?: string;
  from?: string | null; // ISO date
  to?: string | null; // ISO date
  variantId?: string | null;
  format?: "csv";
}

function cors(headers: HeadersInit = {}): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  };
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return toCsvValue(value.join(", "));
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  let body: ExportRequest;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  if (!body.formId || typeof body.formId !== "string") {
    return new Response(JSON.stringify({ error: "formId is required" }), {
      status: 400,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  // Validate user session and CRM access
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const createClient = await loadCreateClient();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  const userId = userData.user.id;
  const { data: hasAccess, error: accessError } = await supabase.rpc("has_crm_access", {
    user_id: userId,
  });
  if (accessError || hasAccess !== true) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  let query = supabase
    .from("lead_form_submissions")
    .select(
      `id, created_at, form_id, variant_id, status, payload, errors, utm_source, utm_medium, utm_campaign, utm_content, utm_term, meta_form_id, meta_lead_id, fbp, fbc, landing_page, referrer, user_agent, ip_address`,
    )
    .eq("form_id", body.formId)
    .order("created_at", { ascending: true });

  if (body.variantId) query = query.eq("variant_id", body.variantId);
  if (body.from) query = query.gte("created_at", body.from);
  if (body.to) query = query.lte("created_at", body.to);

  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  const submissions = rows || [];

  // Determine payload keys across all submissions to produce stable CSV columns
  const keys = new Set<string>();
  for (const r of submissions) {
    const payload = (r.payload as Record<string, unknown>) || {};
    Object.keys(payload).forEach((k) => keys.add(k));
  }

  const payloadColumns = Array.from(keys).sort();
  const fixedColumns = [
    "created_at",
    "status",
    "submission_id",
    "variant_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "meta_form_id",
    "meta_lead_id",
    "fbp",
    "fbc",
    "landing_page",
    "referrer",
    "user_agent",
    "ip_address",
  ];

  const header = [...fixedColumns, ...payloadColumns].join(",");
  const lines: string[] = [header];

  for (const r of submissions) {
    const payload = (r.payload as Record<string, unknown>) || {};
    const row = [
      toCsvValue(r.created_at),
      toCsvValue(r.status),
      toCsvValue(r.id),
      toCsvValue(r.variant_id),
      toCsvValue(r.utm_source),
      toCsvValue(r.utm_medium),
      toCsvValue(r.utm_campaign),
      toCsvValue(r.utm_content),
      toCsvValue(r.utm_term),
      toCsvValue(r.meta_form_id),
      toCsvValue(r.meta_lead_id),
      toCsvValue(r.fbp),
      toCsvValue(r.fbc),
      toCsvValue(r.landing_page),
      toCsvValue(r.referrer),
      toCsvValue(r.user_agent),
      toCsvValue(r.ip_address),
      ...payloadColumns.map((k) => toCsvValue(payload[k])),
    ];
    lines.push(row.join(","));
  }

  const csv = lines.join("\n");
  const fileName = `lead-form-${body.formId}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: cors({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${fileName}`,
    }),
  });
});

