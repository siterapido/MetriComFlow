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

const SUSPICIOUS_DOMAINS = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
];

const INVITE_RATE_LIMIT = Number(Deno.env.get("INVITE_RATE_LIMIT_PER_HOUR") ?? "10");
const INVITE_EXPIRATION_DAYS = Number(Deno.env.get("INVITE_EXPIRATION_DAYS") ?? "7");

type RoleType = "owner" | "admin" | "manager" | "member";
type UserType = "owner" | "traffic_manager" | "sales";

interface InvitationRequest {
  email?: string;
  role?: RoleType;
  user_type?: UserType;
  organization_id?: string;
}

async function sendEmailInvitation(params: {
  to: string;
  inviteLink: string;
  organizationName: string;
  invitedByName: string;
}) {
  // If configured, prefer sending via Supabase Auth's built-in email invite
  // This uses the Auth email provider (SMTP) configured in Supabase Studio.
  const USE_SUPABASE_AUTH_INVITE = (Deno.env.get("USE_SUPABASE_AUTH_INVITE") ?? "").toLowerCase() === "true";
  if (USE_SUPABASE_AUTH_INVITE) {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("[Invites] Missing Supabase envs; skipping Supabase Auth invite email");
    } else {
      try {
        const createClient = await loadCreateClient();
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const adminAny = (supabase.auth.admin as unknown) as { inviteUserByEmail?: (email: string, opts?: { redirectTo?: string }) => Promise<{ data: unknown; error: unknown }> };

        if (typeof adminAny?.inviteUserByEmail === "function") {
          const { error } = await adminAny.inviteUserByEmail!(params.to, { redirectTo: params.inviteLink });
          if (error) {
            console.warn("[Invites] Supabase Auth inviteUserByEmail returned error", error);
          } else {
            console.log("✅ Convite enviado via Supabase Auth para", params.to);
            return; // Sent via Supabase; stop here and do not try Resend
          }
        } else {
          console.warn("[Invites] inviteUserByEmail not available on this client version");
        }
      } catch (e) {
        console.warn("[Invites] Failed to send via Supabase Auth, will try Resend fallback", e);
      }
    }
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY não configurado. Pulando envio de email.");
    return;
  }

  const fromEmail = Deno.env.get("INVITE_FROM_EMAIL") ?? "InsightFy <convites@insightfy.app>";

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="color: #111827;">Você foi convidado para o InsightFy</h2>
      <p>${params.invitedByName} convidou você para entrar na organização <strong>${params.organizationName}</strong>.</p>
      <p>Clique no botão abaixo para aceitar o convite:</p>
      <p style="margin: 24px 0;">
        <a href="${params.inviteLink}" target="_blank" rel="noopener noreferrer"
          style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Aceitar Convite
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p style="word-break: break-all; color: #2563eb;">${params.inviteLink}</p>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        Este link expira em ${INVITE_EXPIRATION_DAYS} dias. Se você não esperava este convite, ignore este email.
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: params.to,
      subject: `Convite para ${params.organizationName} no InsightFy`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("❌ Falha ao enviar email de convite:", errorBody);
    throw new Error("Não foi possível enviar o email de convite. Tente novamente mais tarde.");
  }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Cabeçalho de autorização ausente.");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Token inválido.");
    }

    const body = (await req.json()) as InvitationRequest;
    const role: RoleType = body.role ?? "member";
    const userType: UserType = body.user_type ?? "sales";
    const email = body.email?.trim().toLowerCase();
    const isGeneric = !email;
    const requestedOrganizationId = body.organization_id?.trim();

    if (!isGeneric) {
      if (!email!.includes("@")) {
        throw new Error("Email inválido.");
      }
      const emailDomain = email!.split("@")[1]?.toLowerCase();
      if (emailDomain && SUSPICIOUS_DOMAINS.includes(emailDomain)) {
        throw new Error("Domínio de email não permitido. Utilize um email corporativo.");
      }
    }

    const validRoles: RoleType[] = ["owner", "admin", "manager", "member"];
    if (!validRoles.includes(role)) {
      throw new Error("Função inválida.");
    }

    const validUserTypes: UserType[] = ["owner", "traffic_manager", "sales"];
    if (!validUserTypes.includes(userType)) {
      throw new Error("Tipo de usuário inválido.");
    }

    console.log("📧 Tentando enviar convite", { email, role, userType, requestedBy: user.id });

    // Resolve organization context: verify user has owner or admin role
    let organization: { id: string; name: string; owner_id: string } | null = null;
    let organizationError: any = null;
    let userOrgRole: "owner" | "admin" | "manager" | "member" | null = null;

    if (requestedOrganizationId) {
      // Fetch organization first to determine ownership
      const orgRes = await supabase
        .from("organizations")
        .select("id, name, owner_id, is_active")
        .eq("id", requestedOrganizationId)
        .maybeSingle();

      organizationError = orgRes.error;
      organization = orgRes.data as any;

      if (organizationError || !organization || organization.is_active === false) {
        throw new Error("Organização não encontrada ou inativa.");
      }

      if (organization.owner_id === user.id) {
        userOrgRole = "owner";
      } else {
        const memberRes = await supabase
          .from("organization_memberships")
          .select("role")
          .eq("organization_id", requestedOrganizationId)
          .eq("profile_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (memberRes.error || !memberRes.data) {
          throw new Error("Você não tem permissão para gerenciar esta organização.");
        }

        userOrgRole = memberRes.data.role as any;
        if (!(["owner", "admin"] as const).includes(userOrgRole)) {
          throw new Error("Apenas owners e admins podem enviar convites.");
        }
      }
    } else {
      // Primeiro tenta organização onde usuário é owner
      const ownerOrgRes = await supabase
        .from("organizations")
        .select("id, name, owner_id, is_active")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (ownerOrgRes.data) {
        organization = ownerOrgRes.data as any;
        userOrgRole = "owner";
      } else {
        const memberRes = await supabase
          .from("organization_memberships")
          .select("organization_id, role")
          .eq("profile_id", user.id)
          .eq("is_active", true)
          .in("role", ["owner", "admin"]);

        if (memberRes.error) {
          console.error("Erro ao buscar memberships:", memberRes.error);
          throw new Error("Erro ao verificar permissões de organização.");
        }

        const validMembership = memberRes.data?.[0];
        if (!validMembership) {
          throw new Error("Você não pertence a nenhuma organização como owner ou admin.");
        }

        userOrgRole = validMembership.role as any;

        const orgRes = await supabase
          .from("organizations")
          .select("id, name, owner_id, is_active")
          .eq("id", validMembership.organization_id)
          .maybeSingle();

        if (orgRes.error) {
          console.error("Erro ao buscar organização:", orgRes.error);
        }

        organization = orgRes.data as any;
        organizationError = orgRes.error;
      }
    }

    if (organizationError || !organization) {
      throw new Error("Não foi possível encontrar a organização ou você não tem permissão.");
    }

    const rateWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentInvites, error: countError } = await supabase
      .from("team_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .gte("created_at", rateWindow);

    if (countError) {
      console.error("Erro ao verificar limite de convites:", countError);
    } else if ((recentInvites ?? 0) >= INVITE_RATE_LIMIT) {
      throw new Error("Limite de convites por hora excedido. Tente novamente mais tarde.");
    }

    if (!isGeneric) {
      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileByEmail?.id) {
        const { data: existingMembership } = await supabase
          .from("organization_memberships")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("profile_id", profileByEmail.id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingMembership) {
          throw new Error("Este usuário já faz parte da organização.");
        }
      }

      const { data: pendingInvitation } = await supabase
        .from("team_invitations")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingInvitation) {
        throw new Error("Já existe um convite pendente para este email.");
      }
    }

    const tokenValue = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    const invitationMetadata = {
      organization_name: organization.name,
      invited_by_email: user.email,
      invited_by_name: (user.user_metadata as Record<string, string> | null)?.full_name ?? user.email,
      generic: isGeneric,
    };

    const syntheticEmail = `invite+${tokenValue.slice(0, 8)}@link.insightfy.local`;
    const actualEmail = isGeneric ? syntheticEmail : (email as string);

    console.log("📝 Tentando inserir convite com dados:", {
      email: actualEmail,
      organization_id: organization.id,
      invited_by: user.id,
      role,
      user_type: userType,
      token: tokenValue.substring(0, 8) + "...",
      expires_at: expiresAt.toISOString(),
    });

    const { data: createdInvitation, error: invitationError } = await supabase
      .from("team_invitations")
      .insert({
        email: actualEmail,
        organization_id: organization.id,
        invited_by: user.id,
        role,
        user_type: userType,
        token: tokenValue,
        expires_at: expiresAt.toISOString(),
        metadata: invitationMetadata,
      })
      .select()
      .maybeSingle();

    if (invitationError || !createdInvitation) {
      console.error("❌ Erro ao criar convite:", invitationError);
      console.error("RLS bloqueou? Status:", invitationError?.code);
      throw new Error(`Não foi possível criar o convite. Erro: ${invitationError?.message || "desconhecido"}`);
    }

    const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    const inviteLink = `${APP_URL.replace(/\/$/, "")}/accept-invitation?token=${tokenValue}`;

    // Respeita feature flag: por padrão, não envia email; apenas retorna link copiável
    const INVITE_EMAIL_ENABLED = (Deno.env.get("INVITE_EMAIL_ENABLED") ?? "false").toLowerCase() === "true";
    let emailSent = false;
    let responseMessage = "Convite criado. Copie e compartilhe o link.";
    if (INVITE_EMAIL_ENABLED && !isGeneric) {
      try {
        await sendEmailInvitation({
          to: email!,
          inviteLink,
          organizationName: organization.name,
          invitedByName: invitationMetadata.invited_by_name ?? "Equipe InsightFy",
        });
        emailSent = true;
        responseMessage = `Convite enviado por email para ${email}`;
        console.log("✅ Convite enviado por email para", email);
      } catch (emailError) {
        // Não deletar o convite: manter link disponível para cópia manual
        emailSent = false;
        responseMessage = "Email de convite falhou. Copie e compartilhe o link manualmente.";
        console.error("❌ Falha ao enviar email de convite. Mantendo convite ativo e retornando link.", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: createdInvitation.id,
        invite_link: inviteLink,
        expires_at: createdInvitation.expires_at,
        email_sent: emailSent,
        message: responseMessage,
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
