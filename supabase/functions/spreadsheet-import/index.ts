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

type LeadImportPayload = {
  title: string;
  description?: string | null;
  status?: string | null;
  value?: number | null;
  contract_value?: number | null;
  contract_months?: number | null;
  contract_type?: "monthly" | "annual" | "one_time" | null;
  due_date?: string | null;
  expected_close_date?: string | null;
  last_contact_date?: string | null;
  next_follow_up_date?: string | null;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  lead_score?: number | null;
  conversion_probability?: number | null;
  product_interest?: string | null;
  lead_source_detail?: string | null;
  source?: string | null;
  campaign_id?: string | null;
  external_lead_id?: string | null;
  ad_id?: string | null;
  adset_id?: string | null;
  closed_won_at?: string | null;
  closed_lost_at?: string | null;
  lost_reason?: string | null;
  organization_id?: string | null;
  custom_fields?: Record<string, unknown> | null;
};

serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const t0 = Date.now();
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
    const {
      organization_id,
      rows,
      mapping,
      source_file_name,
      defaults,
    } = body ?? {};

    if (!organization_id) {
      return new Response(
        JSON.stringify({
          error: "organization_id é obrigatório",
          reason: "missing_params",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma linha para importar",
          reason: "empty_rows",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const MAX_ROWS = 5000;
    if (rows.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({
          error: `Limite de ${MAX_ROWS} linhas excedido`,
          reason: "rows_limit_exceeded",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Criar batch de importação
    const batchInsert = await supabase
      .from("lead_import_batches")
      .insert({
        organization_id,
        user_id: null, // Pode ser obtido do token se necessário
        source_file_name: source_file_name ?? null,
        source_file_url: null,
        source_file_hash: null,
        sheet_name: null,
        mapping_json: mapping ?? {},
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (batchInsert.error) {
      console.error("Erro ao criar batch:", batchInsert.error);
      return new Response(
        JSON.stringify({
          error: batchInsert.error.message,
          reason: "batch_insert_failed",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const batch_id = batchInsert.data.id as string;

    // Preparar payloads para inserção
    const payloads: LeadImportPayload[] = rows.map((row: LeadImportPayload) => {
      const payload: LeadImportPayload = {
        ...row,
        organization_id,
        status: row.status || defaults?.status || "novo_lead",
        source: row.source || defaults?.source || "manual",
      };

      // Auto-set closed_won_at quando status é fechado_ganho
      if (payload.status === "fechado_ganho" && !payload.closed_won_at) {
        payload.closed_won_at = new Date().toISOString();
      }

      return payload;
    });

    // Inserir leads
    const { data: insertedLeads, error: insertError } = await supabase
      .from("leads")
      .insert(payloads)
      .select("id");

    if (insertError) {
      console.error("Erro ao inserir leads:", insertError);

      // Registrar todas as linhas como skipped
      const auditRows = rows.map((row: LeadImportPayload) => ({
        batch_id,
        original_values: row,
        normalized_values: null,
        status: "skipped",
        errors: [`insert_failed: ${insertError.message}`],
        lead_id: null,
      }));

      await supabase.from("lead_import_rows").insert(auditRows);

      await supabase
        .from("lead_import_batches")
        .update({
          row_count: rows.length,
          imported_count: 0,
          skipped_count: rows.length,
          error_count: rows.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch_id);

      return new Response(
        JSON.stringify({
          success: false,
          batch_id,
          imported: 0,
          skipped: rows.length,
          error_count: rows.length,
          error: insertError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const insertedIds = (insertedLeads ?? []).map((lead: any) => lead.id as string);

    // Registrar auditoria
    const auditRows = rows.map((row: LeadImportPayload, idx: number) => ({
      batch_id,
      original_values: row,
      normalized_values: payloads[idx],
      status: "imported",
      errors: null,
      lead_id: insertedIds[idx] ?? null,
    }));

    await supabase.from("lead_import_rows").insert(auditRows);

    // Atualizar batch
    const importedCount = insertedIds.length;
    const skippedCount = rows.length - importedCount;

    await supabase
      .from("lead_import_batches")
      .update({
        row_count: rows.length,
        imported_count: importedCount,
        skipped_count: skippedCount,
        error_count: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch_id);

    const t1 = Date.now();
    console.log(
      JSON.stringify({
        event: "spreadsheet_import",
        batch_id,
        rows: rows.length,
        imported: importedCount,
        skipped: skippedCount,
        durationMs: t1 - t0,
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        batch_id,
        imported: importedCount,
        skipped: skippedCount,
        error_count: 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(JSON.stringify({ event: "spreadsheet_import_error", message: msg }));
    return new Response(
      JSON.stringify({ error: msg, reason: "unexpected" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

