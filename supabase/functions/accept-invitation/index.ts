import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AcceptInvitationRequest {
  token: string;
  password?: string;
  full_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { token, password, full_name }: AcceptInvitationRequest = await req.json();

    if (!token) {
      throw new Error("Token do convite é obrigatório.");
    }

    console.log("🔍 Buscando convite pelo token:", token.substring(0, 8) + "…");

    const { data: invitations, error: invitationError } = await supabase.rpc("get_invitation_by_token", {
      invitation_token: token,
    });

    if (invitationError) {
      console.error("❌ Erro ao buscar convite:", invitationError);
      throw new Error("Convite inválido.");
    }

    if (!invitations || invitations.length === 0) {
      throw new Error("Convite não encontrado.");
    }

    const invitation = invitations[0];

    if (invitation.status !== "pending") {
      throw new Error(`Este convite está ${invitation.status}.`);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase.from("team_invitations").update({ status: "expired" }).eq("id", invitation.id);
      throw new Error("Convite expirado.");
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_type")
      .eq("email", invitation.email)
      .maybeSingle();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      console.log("✅ Perfil já existe:", existingProfile.email);
      userId = existingProfile.id;

      if (existingProfile.user_type !== invitation.user_type) {
        const { error: userTypeUpdateError } = await supabase
          .from("profiles")
          .update({ user_type: invitation.user_type })
          .eq("id", userId);

        if (userTypeUpdateError) {
          console.error("Erro ao atualizar user_type:", userTypeUpdateError);
        }
      }
    } else {
      if (!password) {
        throw new Error("Senha é obrigatória para novos usuários.");
      }

      if (!full_name) {
        throw new Error("Nome completo é obrigatório para novos usuários.");
      }

      console.log("👤 Criando novo usuário para:", invitation.email);

      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

      if (signUpError) {
        console.error("❌ Erro ao criar usuário:", signUpError);
        throw new Error("Não foi possível criar a conta.");
      }

      userId = newUser.user.id;
      isNewUser = true;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        email: invitation.email,
        full_name,
        user_type: invitation.user_type,
        role: "user",
      });

      if (profileError) {
        console.error("❌ Erro ao criar profile:", profileError);
      }
    }

    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id, is_active")
      .eq("organization_id", invitation.organization_id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (membership?.is_active) {
      throw new Error("Você já faz parte desta organização.");
    }

    const nowIso = new Date().toISOString();

    if (membership && !membership.is_active) {
      const { error: reactivateError } = await supabase
        .from("organization_memberships")
        .update({
          is_active: true,
          role: invitation.role,
          joined_at: nowIso,
          left_at: null,
          invited_by: invitation.invited_by,
        })
        .eq("id", membership.id);

      if (reactivateError) {
        console.error("Erro ao reativar membership:", reactivateError);
        throw new Error("Não foi possível reativar o acesso.");
      }
    } else {
      const { error: membershipError } = await supabase.from("organization_memberships").insert({
        organization_id: invitation.organization_id,
        profile_id: userId,
        role: invitation.role,
        is_active: true,
        joined_at: nowIso,
        invited_by: invitation.invited_by,
      });

      if (membershipError) {
        console.error("❌ Erro ao criar membership:", membershipError);
        throw new Error("Não foi possível adicionar o usuário à organização.");
      }
    }

    const { error: updateInvitationError } = await supabase
      .from("team_invitations")
      .update({
        status: "accepted",
        accepted_at: nowIso,
        accepted_by: userId,
      })
      .eq("id", invitation.id);

    if (updateInvitationError) {
      console.error("Erro ao atualizar convite:", updateInvitationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        organization_id: invitation.organization_id,
        organization_name: invitation.organization_name,
        is_new_user: isNewUser,
        message: `Bem-vindo à ${invitation.organization_name}!`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
