// @ts-nocheck
// Declare Deno for TypeScript editors that don't load the Edge Runtime types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Lazy load to avoid editor resolution issues
async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface InviteRequestBody {
  email: string;
  role?: "owner" | "admin" | "manager" | "member";
  user_type?: "owner" | "traffic_manager" | "sales";
  organization_id?: string;
}

function normalizeBaseUrl(input: string | undefined): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    url.search = "";
    url.hash = "";
    // Remove trailing slash consistently
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL =
      Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL") || "";
    const SERVICE_ROLE =
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Missing Supabase service configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Require user auth via Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: InviteRequestBody = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: authorization logic could validate the caller has rights on the organization
    const organizationId = body.organization_id?.trim();

    // Compute redirect URL on the server to avoid newline/whitespace issues
    const BASE_URL =
      normalizeBaseUrl(Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL")) ||
      "https://www.insightfy.com.br";
    const redirectTo = `${BASE_URL}/accept-invitation`;

    const role = body.role || "member";
    const userType = body.user_type || "sales";

    const { error } = await (supabase as any).auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        organization_id: organizationId ?? null,
        invited_by: user.id,
        role,
        user_type: userType,
      },
    });

    if (error) {
      console.error("inviteUserByEmail error:", error);
      return new Response(JSON.stringify({ error: error.message || "Invite failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, email, redirectTo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-invite exception:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

