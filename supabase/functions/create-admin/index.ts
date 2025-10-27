// @ts-nocheck
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Supabase client será carregado dinamicamente para evitar problemas de resolução no editor

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Carrega createClient com fallback de CDN
async function loadCreateClient() {
  try {
    const mod = await import("https://esm.sh/@supabase/supabase-js@2.75.0");
    return mod.createClient;
  } catch (_) {
    const mod2 = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.75.0/+esm"
    );
    return mod2.createClient;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Read env with fallback names (CLI forbids SUPABASE_* in secrets)
  const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase env vars" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const createClient = await loadCreateClient();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === "GET") {
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const allowed = !admins || admins.length === 0;
    return new Response(
      JSON.stringify({ allowed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (req.method === "POST") {
    try {
      const { email, password, fullName } = await req.json();
      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios: email, password, fullName" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: admins, error: adminCheckErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1);
      if (adminCheckErr) throw adminCheckErr;
      if (admins && admins.length > 0) {
        return new Response(
          JSON.stringify({ error: "Já existe um admin configurado." }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr) throw createErr;

      const userId = created.user?.id;
      if (!userId) throw new Error("Usuário criado sem ID");

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ role: "admin", full_name: fullName, email })
        .eq("id", userId);
      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ message: "Admin criado com sucesso", user_id: userId }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || "Erro ao criar admin" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Método não suportado" }),
    { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});