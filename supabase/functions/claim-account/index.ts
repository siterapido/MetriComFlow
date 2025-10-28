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

interface ClaimAccountRequest {
  claimToken: string;
  organizationId: string;
  subscriptionId: string;
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    const SUPABASE_URL = (globalThis as any).Deno?.env.get("PROJECT_URL")
      ?? (globalThis as any).Deno?.env.get("SUPABASE_URL")
      ?? "";
    const SERVICE_ROLE_KEY = (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY")
      ?? (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY")
      ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { claimToken, organizationId, subscriptionId }: ClaimAccountRequest = await req.json();

    if (!claimToken || !organizationId || !subscriptionId) {
      throw new Error("Dados de reivindicação inválidos.");
    }

    // Identify current user from Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: getUserError } = await supabase.auth.getUser(jwt);
    if (getUserError || !userData?.user) {
      throw new Error("Falha ao identificar usuário.");
    }
    const user = userData.user;

    // Validate subscription and claim token
    const { data: sub, error: subError } = await supabase
      .from("organization_subscriptions")
      .select("id, organization_id, metadata, organizations(name, owner_id)")
      .eq("id", subscriptionId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (subError) {
      throw subError;
    }
    if (!sub) {
      throw new Error("Assinatura/organização não encontrada.");
    }

    const metadata = (sub as any).metadata || {};
    if (!metadata?.claim_token || metadata.claim_token !== claimToken) {
      throw new Error("Token de reivindicação inválido ou já utilizado.");
    }

    const nowIso = new Date().toISOString();

    // Ensure profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const fullName = (user.user_metadata?.full_name as string) || (user.email?.split("@")[0] ?? "Usuário");
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: "user",
        user_type: "owner",
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (profileError) {
        console.warn("Não foi possível criar perfil do usuário:", profileError);
      }
    } else if (existingProfile.user_type !== "owner") {
      const { error: promoteProfileError } = await supabase
        .from("profiles")
        .update({ user_type: "owner", updated_at: nowIso })
        .eq("id", user.id);
      if (promoteProfileError) {
        console.warn("Não foi possível promover usuário para owner:", promoteProfileError);
      }
    }

    // Create or activate membership as owner
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id, is_active")
      .eq("organization_id", organizationId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (membership?.is_active) {
      // Already a member; continue
      console.log("Usuário já é membro ativo da organização.");
    } else if (membership && !membership.is_active) {
      const { error: reactivateError } = await supabase
        .from("organization_memberships")
        .update({ is_active: true, role: "owner", joined_at: nowIso, left_at: null })
        .eq("id", membership.id);
      if (reactivateError) {
        throw reactivateError;
      }
    } else {
      const { error: membershipError } = await supabase.from("organization_memberships").insert({
        organization_id: organizationId,
        profile_id: user.id,
        role: "owner",
        is_active: true,
        joined_at: nowIso,
      });
      if (membershipError) {
        throw membershipError;
      }
    }

    // Set organization owner if empty
    const orgOwnerId = (sub as any).organizations?.owner_id ?? null;
    if (!orgOwnerId) {
      const { error: setOwnerError } = await supabase
        .from("organizations")
        .update({ owner_id: user.id, updated_at: nowIso })
        .eq("id", organizationId);
      if (setOwnerError) {
        console.warn("Falha ao definir owner_id da organização:", setOwnerError);
      }
    }

    // Mark subscription as claimed
    const newMetadata = { ...(metadata || {}), claimed_by: user.id, claimed_at: nowIso };
    const { error: updateSubErr } = await supabase
      .from("organization_subscriptions")
      .update({ metadata: newMetadata, updated_at: nowIso })
      .eq("id", subscriptionId);
    if (updateSubErr) {
      console.warn("Falha ao atualizar metadata da assinatura:", updateSubErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Organização reivindicada com sucesso.",
        organization_id: organizationId,
        subscription_id: subscriptionId,
        user_id: user.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("❌ Erro ao reivindicar organização:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
