import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const SUPABASE_URL = (globalThis as any).Deno?.env.get("PROJECT_URL") ?? (globalThis as any).Deno?.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ?? "";
    const APP_URL = (globalThis as any).Deno?.env.get("APP_URL") ?? (globalThis as any).Deno?.env.get("VITE_APP_URL") ?? "http://localhost:5173";
    const RESEND_API_KEY = (globalThis as any).Deno?.env.get("RESEND_API_KEY") ?? "";
    const FROM_EMAIL = (globalThis as any).Deno?.env.get("MAGIC_LINK_FROM_EMAIL") ?? "InsightFy <acesso@insightfy.app>";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Configuração do Supabase ausente" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!jwt) {
      return json({ error: "Não autenticado" }, 401);
    }

    const body = await req.json().catch(() => ({} as any));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

    // Autenticar usuário chamador
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData?.user) {
      return json({ error: "Token inválido" }, 401);
    }

    // Limite de reenvio por hora
    const windowIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent, error: countErr } = await supabase
      .from("magic_links")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", windowIso);

    if (countErr) {
      console.warn("Falha ao contar magic links recentes:", countErr);
    } else if ((recent ?? 0) >= 3) {
      return json({ error: "Limite de reenvio excedido. Tente novamente mais tarde." }, 429);
    }

    // Revogar tokens ativos anteriores
    await supabase
      .from("magic_links")
      .update({ status: "revoked" })
      .eq("email", email)
      .eq("status", "active");

    // Gerar novo token
    const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await sha256Hex(rawToken);
    const ttlMinutes = Number((globalThis as any).Deno?.env.get("MAGIC_LINK_TTL_MINUTES") ?? "30");
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { data: insert } = await supabase
      .from("magic_links")
      .insert({ email, token_hash: tokenHash, expires_at: expiresAt, status: "active" })
      .select("id")
      .single();

    const validateUrl = `${String(APP_URL).replace(/\/$/, "")}/magic/validate?t=${encodeURIComponent(rawToken)}`;

    // Enviar email (Resend)
    let emailSent = false;
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2 style="color: #111827;">Seu acesso está pronto</h2>
          <p>Use o botão abaixo para entrar com seu Magic Link. Este link é válido por ${ttlMinutes} minutos e pode ser usado apenas uma vez.</p>
          <p style="margin: 24px 0;">
            <a href="${validateUrl}" target="_blank" rel="noopener noreferrer"
              style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Entrar com Magic Link
            </a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="word-break: break-all; color: #2563eb;">${validateUrl}</p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #6b7280;">Se você não esperava este e-mail, ignore-o. Em caso de expiração, solicite um novo link pelo app.</p>
        </div>
      `;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "Seu Magic Link de acesso", html }),
      });
      emailSent = res.ok;
      if (!res.ok) {
        console.error("Falha ao enviar e-mail de magic link:", await res.text());
      }
    }

    return json({ success: true, email_sent: emailSent, validate_url: validateUrl, id: insert?.id ?? null });
  } catch (err) {
    console.error("resend-magic-link error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});