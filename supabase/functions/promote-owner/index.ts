import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Allow jsr imports in local editors without Deno tooling
import { createClient } from "jsr:@supabase/supabase-js@2";

type PromoteOwnerBody = {
  organizationName?: string;
  planSlug?: string; // default: 'pro'
};

const SUPABASE_URL = (globalThis as any).Deno?.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = (globalThis as any).Deno?.env.get("SUPABASE_ANON_KEY")!;
// Note: Supabase secrets cannot start with "SUPABASE_". Use SERVICE_ROLE_KEY.
const SERVICE_ROLE_KEY = (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY")!;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userError?.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: PromoteOwnerBody = await req.json().catch(() => ({}));
    const planSlug = body.planSlug || "pro";

    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Promote profile to owner (user_type)
    const { error: updateProfileError } = await serviceClient
      .from("profiles")
      .update({ user_type: "owner" })
      .eq("id", user.id);
    if (updateProfileError) {
      // If column doesn't exist or RLS, return error
      return new Response(
        JSON.stringify({ error: "Failed to promote user", details: updateProfileError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Ensure organization exists for this owner
    const { data: existingOrg, error: orgCheckError } = await serviceClient
      .from("organizations")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (orgCheckError) {
      return new Response(
        JSON.stringify({ error: "Failed to check organization", details: orgCheckError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let organizationId = existingOrg?.id as string | undefined;
    if (!organizationId) {
      const orgNameBase = body.organizationName || user.user_metadata?.full_name || user.email || "Minha Organização";
      const proposedSlug = slugify(typeof user.email === "string" ? user.email.split("@")[0] : orgNameBase);
      // Ensure unique slug by appending random if conflict
      let finalSlug = proposedSlug;
      const { data: slugConflict } = await serviceClient
        .from("organizations")
        .select("id")
        .eq("slug", finalSlug)
        .limit(1);
      if (slugConflict && slugConflict.length > 0) {
        finalSlug = `${proposedSlug}-${crypto.randomUUID().slice(0, 8)}`;
      }

      const { data: newOrg, error: createOrgError } = await serviceClient
        .from("organizations")
        .insert({ name: orgNameBase, slug: finalSlug, owner_id: user.id, billing_email: user.email })
        .select("id")
        .single();
      if (createOrgError) {
        return new Response(
          JSON.stringify({ error: "Failed to create organization", details: createOrgError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      organizationId = newOrg.id as string;
    }

    // 3) Ensure a trial subscription exists
    const { data: plan, error: planError } = await serviceClient
      .from("subscription_plans")
      .select("id")
      .eq("slug", planSlug)
      .limit(1)
      .single();
    if (planError || !plan?.id) {
      return new Response(
        JSON.stringify({ error: "Subscription plan not found", details: planError?.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: existingSub } = await serviceClient
      .from("organization_subscriptions")
      .select("id, status")
      .eq("organization_id", organizationId)
      .limit(1)
      .maybeSingle();

    if (!existingSub) {
      const now = new Date();
      const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error: createSubError } = await serviceClient
        .from("organization_subscriptions")
        .insert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: "trial",
          current_period_start: now.toISOString(),
          current_period_end: in30d.toISOString(),
          trial_end: in30d.toISOString(),
          next_billing_date: in30d.toISOString(),
          metadata: { trial_granted: true },
        });
      if (createSubError) {
        return new Response(
          JSON.stringify({ error: "Failed to create trial subscription", details: createSubError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4) Refresh materialized view for plan limits
    await serviceClient.rpc("refresh_organization_plan_limits");

    return new Response(
      JSON.stringify({ success: true, organizationId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});