import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("t") ?? url.searchParams.get("token");
    const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
    const userAgent = req.headers.get("user-agent") ?? "";

    if (!token) {
      return json({ error: "Token ausente" }, 400);
    }

    const SUPABASE_URL = (globalThis as any).Deno?.env.get("PROJECT_URL") ?? (globalThis as any).Deno?.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ?? "";
    const APP_URL = (globalThis as any).Deno?.env.get("APP_URL") ?? (globalThis as any).Deno?.env.get("VITE_APP_URL") ?? undefined;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Configuração do Supabase ausente" }, 500);
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();

    // Incrementa tentativas e busca registro ativo
    const { data: linkRecord } = await supabase
      .from("magic_links")
      .select("id, email, user_id, checkout_session_id, expires_at, status, attempt_count")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!linkRecord) {
      return json({ error: "Link inválido ou não encontrado", code: "invalid_link" }, 400);
    }

    const expired = typeof linkRecord.expires_at === "string" && new Date(linkRecord.expires_at).getTime() <= Date.now();
    const tooManyAttempts = (linkRecord.attempt_count ?? 0) >= 5;
    const notActive = linkRecord.status !== "active";

    // Atualiza tentativa
    await supabase
      .from("magic_links")
      .update({
        attempt_count: (linkRecord.attempt_count ?? 0) + 1,
        last_attempt_at: nowIso,
        last_attempt_ip: forwardedFor.split(",")[0]?.trim() || null,
        last_attempt_ua: userAgent,
      })
      .eq("id", linkRecord.id);

    if (expired || tooManyAttempts || notActive) {
      const status = expired ? "expired" : notActive ? "consumed" : "rate_limited";
      return json({ error: "Link indisponível", code: status, hint: "Solicite reenvio do magic link" }, 400);
    }

    // Marca consumo (uso único)
    await supabase
      .from("magic_links")
      .update({ status: "consumed", consumed_at: nowIso })
      .eq("id", linkRecord.id);

    // Gera link oficial do Supabase Auth (magic link)
    const adminAny: any = (supabase as any).auth?.admin;
    if (!adminAny || typeof adminAny.generateLink !== "function") {
      // Fallback: informar ao usuário que faça login via e-mail (fluxo padrão) ou reenviar
      return json({
        error: "generateLink indisponível",
        code: "not_supported",
        hint: "Use reenvio para receber um link de login ou acesse /login",
      }, 501);
    }

    const redirectTo = APP_URL ? `${String(APP_URL).replace(/\/$/, "")}/pos-login` : undefined;
    const email = linkRecord.email as string;
    const genRes = await adminAny.generateLink({ type: "magiclink", email, options: { redirectTo } });

    const actionLink: string | undefined = genRes?.data?.action_link ?? genRes?.data?.email_otp_url ?? undefined;
    if (!actionLink) {
      return json({ error: "Falha ao gerar link de autenticação", code: "generate_failed" }, 500);
    }

    return Response.redirect(actionLink, 302);
  } catch (err) {
    console.error("validate-magic-link error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});