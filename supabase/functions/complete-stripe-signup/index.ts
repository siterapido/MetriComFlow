import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

type CompleteSignupRequest = {
  claimToken?: string;
  password?: string;
};

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL =
      (globalThis as any).Deno?.env.get("PROJECT_URL") ??
      (globalThis as any).Deno?.env.get("SUPABASE_URL") ??
      "";
    const SERVICE_ROLE_KEY =
      (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
      "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = (await req.json().catch(() => ({}))) as CompleteSignupRequest;
    const claimToken = payload.claimToken?.trim();
    const password = payload.password?.trim();

    if (!claimToken) {
      throw new Error("claimToken é obrigatório.");
    }
    if (!password || password.length < 6) {
      throw new Error("Senha inválida. Utilize ao menos 6 caracteres.");
    }

    let { data: subscription, error } = await supabase
      .from("organization_subscriptions")
      .select("id, organization_id, plan_id, claim_token, claim_email, claim_status, metadata")
      .eq("claim_token", claimToken)
      .maybeSingle();

    if (!subscription && !error) {
      const fallback = await supabase
        .from("organization_subscriptions")
        .select("id, organization_id, plan_id, claim_token, claim_email, claim_status, metadata")
        .contains("metadata", { claim: { token: claimToken } } as any)
        .maybeSingle();
      subscription = fallback.data ?? null;
      error = fallback.error ?? null;
    }

    if (error) {
      throw error;
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou inexistente." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metadata = (subscription as any).metadata ?? {};
    const claimMeta = metadata?.claim ?? {};
    const existingStatus: string | null = (subscription as any).claim_status ?? claimMeta?.status ?? null;
    const email =
      ((subscription as any).claim_email as string | null | undefined) ??
      (typeof claimMeta?.email === "string" ? claimMeta.email : null);

    if (!email) {
      throw new Error("Não foi possível identificar o email associado ao token.");
    }

    if (existingStatus && existingStatus !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: "Conta já finalizada para este token." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminAny: any = (supabase as any).auth?.admin;
    if (!adminAny) {
      throw new Error("Admin SDK indisponível.");
    }

    let userId: string | null =
      (typeof claimMeta?.user_id === "string" && claimMeta.user_id) ||
      (typeof metadata?.owner_user_id === "string" && metadata.owner_user_id) ||
      null;

    if (!userId && adminAny.getUserByEmail) {
      try {
        const { data } = await adminAny.getUserByEmail(email);
        userId = data?.user?.id ?? null;
      } catch (err) {
        console.debug("complete-stripe-signup getUserByEmail fallback failed", err);
      }
    }

    if (!userId && adminAny.listUsers) {
      try {
        const listRes = await adminAny.listUsers({ page: 1, perPage: 100 });
        const found = listRes?.data?.users?.find(
          (u: any) => typeof u?.email === "string" && u.email.toLowerCase() === email.toLowerCase(),
        );
        userId = found?.id ?? null;
      } catch (err) {
        console.debug("complete-stripe-signup listUsers fallback failed", err);
      }
    }

    if (!userId) {
      throw new Error("Usuário não encontrado para definir senha.");
    }

    const updateUserResult = await adminAny.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateUserResult?.error) {
      throw updateUserResult.error;
    }

    const nowIso = new Date().toISOString();
    const newClaimMetadata = {
      ...claimMeta,
      token: claimToken,
      email,
      status: "completed",
      completed_at: nowIso,
      user_id: userId,
    };
    const newMetadata = {
      ...metadata,
      claim: newClaimMetadata,
      owner_user_id: userId,
    };

    const { error: updateSubscriptionError } = await supabase
      .from("organization_subscriptions")
      .update({
        claim_status: "completed",
        claim_completed_at: nowIso,
        claim_email: email,
        metadata: newMetadata,
        updated_at: nowIso,
      })
      .eq("id", (subscription as any).id);
    if (updateSubscriptionError) {
      console.warn("Falha ao atualizar claim_status:", updateSubscriptionError);
    }

    const { error: membershipError } = await supabase
      .from("organization_memberships")
      .upsert(
        {
          organization_id: (subscription as any).organization_id,
          profile_id: userId,
          role: "owner",
          is_active: true,
          joined_at: nowIso,
          left_at: null,
        },
        { onConflict: "organization_id,profile_id" },
      );
    if (membershipError) {
      console.warn("Falha ao garantir membership ativa:", membershipError);
    }

    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("complete-stripe-signup error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
