import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

interface CreateMemberRequest {
    email: string;
    password: string;
    full_name: string;
    role?: "owner" | "admin" | "manager" | "member";
    user_type?: "owner" | "traffic_manager" | "sales";
}

/**
 * EDGE FUNCTION: Create Team Member
 *
 * Propósito: Criar um novo usuário com email e senha já vinculado à organização do usuário atual
 *
 * Fluxo:
 * 1. Verifica autenticação do usuário atual
 * 2. Busca a organização do usuário atual
 * 3. Cria o novo usuário no auth
 * 4. Cria o perfil na tabela profiles (via trigger)
 * 5. Vincula à organização via organization_memberships
 */
Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Importar Supabase dynamicamente
        const mod = await import("jsr:@supabase/supabase-js@2");
        const { createClient } = mod;

        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
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

        // Cliente com service role para operações administrativas
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Cliente regular para validar sessão do usuário
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Autorização necessária",
                }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: authHeader },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verificar usuário autenticado
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Usuário não autenticado",
                }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Buscar organização do usuário atual
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from("organization_memberships")
            .select("organization_id, role")
            .eq("profile_id", user.id)
            .eq("is_active", true)
            .single();

        if (membershipError || !membership) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Usuário não está vinculado a uma organização",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se o usuário tem permissão (owner)
        if (membership.role !== "owner") {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Apenas proprietários podem criar novos membros",
                }),
                {
                    status: 403,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const body = (await req.json()) as CreateMemberRequest;

        // Validar dados
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

        if (!body.password || body.password.length < 8) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "A senha deve ter no mínimo 8 caracteres",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!body.full_name || body.full_name.trim().length < 2) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Nome completo inválido",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const role = body.role || "member";
        const userType = body.user_type || "sales";

        console.log("🚀 Criando novo membro:", {
            email: body.email,
            full_name: body.full_name,
            role,
            user_type: userType,
            organization_id: membership.organization_id,
        });

        // 1. Criar usuário no auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true, // Confirmar email automaticamente
            user_metadata: {
                full_name: body.full_name,
                user_type: userType,
            },
        });

        if (authError) {
            console.error("❌ Erro ao criar usuário no auth:", authError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: authError.message || "Erro ao criar usuário",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!authData.user) {
            throw new Error("Usuário não foi criado");
        }

        console.log("✅ Usuário criado no auth:", authData.user.id);

        // 2. Aguardar um pouco para o trigger criar o perfil
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Verificar se o perfil foi criado
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single();

        if (profileError) {
            console.error("❌ Erro ao buscar perfil:", profileError);
            // Tentar criar manualmente se o trigger falhou
            const { error: insertError } = await supabaseAdmin
                .from("profiles")
                .insert({
                    id: authData.user.id,
                    email: body.email,
                    full_name: body.full_name,
                    user_type: userType,
                });

            if (insertError) {
                console.error("❌ Erro ao criar perfil manualmente:", insertError);
            }
        }

        // 4. Criar vínculo com a organização
        const { error: membershipInsertError } = await supabaseAdmin
            .from("organization_memberships")
            .insert({
                organization_id: membership.organization_id,
                profile_id: authData.user.id,
                role: role,
                is_active: true,
            });

        if (membershipInsertError) {
            console.error("❌ Erro ao vincular à organização:", membershipInsertError);

            // Se falhar, tentar deletar o usuário criado para manter consistência
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Erro ao vincular usuário à organização",
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        console.log("✅ Membro criado e vinculado com sucesso!");

        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: authData.user.id,
                    email: body.email,
                    full_name: body.full_name,
                    role: role,
                    user_type: userType,
                },
                message: `Usuário ${body.full_name} criado com sucesso!`,
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
