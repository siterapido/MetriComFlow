// @ts-nocheck
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não suportado" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    console.log("delete-user: Iniciando...");

    // Read env with fallback names
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("delete-user: SUPABASE_URL =", SUPABASE_URL ? "OK" : "MISSING");
    console.log("delete-user: SUPABASE_SERVICE_ROLE_KEY =", SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env vars" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get("authorization");
    console.log("delete-user: authHeader =", authHeader ? "OK" : "MISSING");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("delete-user: Carregando createClient...");
    const createClient = await loadCreateClient();

    // Criar cliente admin com service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extrair token e decodificar para pegar o user_id
    const token = authHeader.replace("Bearer ", "");
    console.log("delete-user: Token extraído");

    // Decodificar JWT manualmente para obter o user_id
    // JWT tem 3 partes separadas por ponto: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Decodificar payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const currentUserId = payload.sub;
    console.log("delete-user: User ID do token:", currentUserId);

    if (!currentUserId) {
      return new Response(
        JSON.stringify({ error: "Token sem user ID" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se o usuário atual é owner
    console.log("delete-user: Verificando se usuário é owner...");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_type")
      .eq("id", currentUserId)
      .single();

    console.log("delete-user: Profile result - user_type:", profile?.user_type, "error:", profileError?.message);

    if (profileError || !profile || profile.user_type !== "owner") {
      return new Response(
        JSON.stringify({ error: "Apenas owners podem deletar usuários" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obter userId do corpo da requisição (usuário a ser deletado)
    const { userId: targetUserId } = await req.json();
    console.log("delete-user: Target user ID:", targetUserId);

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "userId é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se o usuário a ser deletado não é um owner
    console.log("delete-user: Verificando perfil do usuário a ser deletado...");
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("user_type, email")
      .eq("id", targetUserId)
      .single();

    if (targetProfileError) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (targetProfile.user_type === "owner") {
      return new Response(
        JSON.stringify({ error: "Não é permitido deletar usuários owner" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Primeiro DELETE no perfil para evitar violação de FK (profiles -> auth.users)
    console.log("delete-user: Deletando perfil (antes do auth)...");
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (deleteProfileError) {
      console.error("delete-user: Erro ao deletar perfil:", deleteProfileError);
      // Seguimos adiante mesmo se o perfil já não existir
    }

    // Agora deletar o usuário usando admin API
    console.log("delete-user: Deletando usuário do auth...");
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) {
      console.error("delete-user: Erro ao deletar do auth:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: deleteAuthError.message || "Erro ao deletar usuário no Auth" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("delete-user: Usuário deletado com sucesso!");
    return new Response(
      JSON.stringify({
        message: "Usuário deletado com sucesso",
        email: targetProfile.email
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("delete-user: ERRO FATAL:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro ao deletar usuário" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
