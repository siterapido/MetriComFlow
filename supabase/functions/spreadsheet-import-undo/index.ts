import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Content-Type": "application/json",
};

function handleCorsOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Configuração do Supabase ausente",
          reason: "missing_config",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { batch_id, organization_id } = body ?? {};

    if (!batch_id || !organization_id) {
      return new Response(
        JSON.stringify({
          error: "batch_id e organization_id são obrigatórios",
          reason: "missing_params",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar batch
    const { data: batch, error: batchErr } = await supabase
      .from("lead_import_batches")
      .select("id, organization_id, imported_count, skipped_count")
      .eq("id", batch_id)
      .single();

    if (batchErr || !batch || batch.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({
          error: batchErr?.message ?? "Lote inválido ou de outra organização",
          reason: "invalid_batch",
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Buscar linhas importadas
    const { data: rows, error: rowsErr } = await supabase
      .from("lead_import_rows")
      .select("id, lead_id")
      .eq("batch_id", batch_id)
      .eq("status", "imported");

    if (rowsErr) {
      return new Response(
        JSON.stringify({
          error: rowsErr.message,
          reason: "rows_query_failed",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const leadIds = (rows ?? [])
      .map((r: any) => r.lead_id)
      .filter((id: any) => !!id);

    if (leadIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, undone: 0 }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Verificar se há atividades além da criação (bloquear undo)
    const { data: acts, error: actsErr } = await supabase
      .from("lead_activity")
      .select("lead_id, action_type")
      .in("lead_id", leadIds)
      .limit(10000);

    if (actsErr) {
      return new Response(
        JSON.stringify({
          error: actsErr.message,
          reason: "activity_query_failed",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const blockedSet = new Set<string>();
    (acts ?? []).forEach((a: any) => {
      if (a.action_type && a.action_type !== "created") {
        blockedSet.add(a.lead_id);
      }
    });

    const allowedLeadIds = leadIds.filter((id) => !blockedSet.has(id));

    let undone = 0;
    if (allowedLeadIds.length > 0) {
      // Deletar leads permitidos
      const { error: delErr } = await supabase
        .from("leads")
        .delete()
        .in("id", allowedLeadIds);

      if (delErr) {
        return new Response(
          JSON.stringify({
            error: delErr.message,
            reason: "delete_failed",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      undone = allowedLeadIds.length;

      // Atualizar status das linhas
      const { error: updErr } = await supabase
        .from("lead_import_rows")
        .update({ status: "skipped", errors: ["undo"] })
        .eq("batch_id", batch_id)
        .in("lead_id", allowedLeadIds);

      if (updErr) {
        return new Response(
          JSON.stringify({
            error: updErr.message,
            reason: "rows_update_failed",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Atualizar contadores do batch
      const { error: updBatchErr } = await supabase
        .from("lead_import_batches")
        .update({
          imported_count: (batch as any).imported_count - undone,
          skipped_count: (batch as any).skipped_count + undone,
        })
        .eq("id", batch_id);

      if (updBatchErr) {
        return new Response(
          JSON.stringify({
            error: updBatchErr.message,
            reason: "batch_update_failed",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, undone }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(
      JSON.stringify({ event: "spreadsheet_import_undo_error", message: msg })
    );
    return new Response(
      JSON.stringify({ error: msg, reason: "unexpected" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

