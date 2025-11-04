import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteRequest {
  email: string;
  role?: "owner" | "admin" | "manager" | "member";
  user_type?: "owner" | "traffic_manager" | "sales";
  organization_id?: string;
}

/**
 * EDGE FUNCTION: Simple Invite User
 *
 * Propósito: Chamar supabase.auth.admin.inviteUserByEmail() de forma segura
 * (requer service role key no servidor, não no navegador)
 *
 * Fluxo:
 * 1. Cliente envia email + metadata no corpo da requisição
 * 2. Function usa service role key (seguro no servidor)
 * 3. Supabase envia email com token
 * 4. Function retorna sucesso/erro ao cliente
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as InviteRequest;

    if (!body.email || !body.email.includes("@")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email inválido",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Importar Supabase dynamicamente
    const mod = await import("jsr:@supabase/supabase-js@2");
    const { createClient } = mod;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Variáveis de ambiente Supabase não configuradas");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao configurar servidor",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Preparar metadados com info do convite
    const userData = {
      full_name: body.email.split("@")[0], // Nome padrão baseado no email
      organization_id: body.organization_id,
      role: body.role || "member",
      user_type: body.user_type || "sales",
    };

    const appUrl =
      Deno.env.get("APP_URL") || "http://localhost:5173";
    const redirectTo = `${appUrl}/accept-invitation`;

    console.log("📧 Invitando usuário:", {
      email: body.email,
      redirectTo,
      metadata: userData,
    });

    // Chamar inviteUserByEmail (requer service role key)
    const { data, error } = await (supabase.auth.admin as any).inviteUserByEmail(
      body.email,
      {
        redirectTo,
        data: userData,
      }
    );

    if (error) {
      console.error("❌ Erro ao convidar usuário:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Erro ao enviar convite",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Convite enviado com sucesso para:", body.email);

    return new Response(
      JSON.stringify({
        success: true,
        email: body.email,
        message: `Convite enviado para ${body.email}. Link válido por 24 horas.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro na função:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar requisição",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
