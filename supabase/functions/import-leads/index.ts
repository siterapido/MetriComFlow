import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read env with fallback names (CLI forbids SUPABASE_* in secrets sometimes)
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

type MappingJson = Record<string, string | undefined>;

const STATUS_ALIAS: Record<string, string> = {
  novo_lead: "novo_lead",
  novo: "novo_lead",
  qualificacao: "qualificacao",
  qualificacao_lead: "qualificacao",
  "qualificação": "qualificacao",
  proposta: "proposta",
  negociacao: "negociacao",
  "negociação": "negociacao",
  fechado_ganho: "fechado_ganho",
  ganho: "fechado_ganho",
  fechado_perdido: "fechado_perdido",
  perdido: "fechado_perdido",
  follow_up: "follow_up",
  follow: "follow_up",
  aguardando_resposta: "aguardando_resposta",
  aguardando: "aguardando_resposta",
};

const PRIORITY_ALIAS: Record<string, "low" | "medium" | "high" | "urgent"> = {
  baixa: "low",
  low: "low",
  media: "medium",
  "médio": "medium",
  medium: "medium",
  alta: "high",
  high: "high",
  urgente: "urgent",
  urgent: "urgent",
};

const SOURCE_ALIAS: Record<string, string> = {
  manual: "manual",
  meta_ads: "meta_ads",
  meta: "meta_ads",
  whatsapp: "whatsapp",
  google_ads: "google_ads",
  google: "google_ads",
  site: "site",
  website: "site",
  email: "email",
  telefone: "telefone",
  phone: "telefone",
  indicacao: "indicacao",
  referencia: "indicacao",
  evento: "evento",
  event: "evento",
};

const CONTRACT_TYPE_ALIAS: Record<string, "monthly" | "annual" | "one_time"> = {
  mensal: "monthly",
  month: "monthly",
  monthly: "monthly",
  anual: "annual",
  anualy: "annual",
  annual: "annual",
  unico: "one_time",
  "único": "one_time",
  once: "one_time",
  "one time": "one_time",
};

const stripAccents = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeKey = (value?: string | null) => {
  if (!value) return "";
  return stripAccents(value.toLowerCase()).replace(/[\s-]+/g, "_");
};
const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text) return undefined;
  const hasComma = text.includes(",");
  let normalized = text.replace(/[^\d.,-]/g, "");
  if (hasComma) normalized = normalized.replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};
const parseInteger = (value: unknown): number | undefined => {
  const parsed = parseNumber(value);
  if (parsed === undefined) return undefined;
  return Math.round(parsed);
};
const clampPercentage = (value: number) => {
  if (Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(100, value));
};
const toIsoDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};
const toText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};
const normalizeStatus = (value?: string | null): string | undefined => {
  const canonical = normalizeKey(value);
  if (!canonical) return undefined;
  return STATUS_ALIAS[canonical] ?? canonical;
};
const normalizePriority = (
  value?: string | null,
): "low" | "medium" | "high" | "urgent" | undefined => {
  const canonical = normalizeKey(value);
  if (!canonical) return undefined;
  return PRIORITY_ALIAS[canonical];
};
const normalizeSource = (value?: string | null, fallback?: string) => {
  const canonical = normalizeKey(value);
  if (!canonical) return fallback;
  return SOURCE_ALIAS[canonical] ?? fallback;
};
const normalizeContractType = (
  value?: string | null,
): "monthly" | "annual" | "one_time" | undefined => {
  const canonical = normalizeKey(value);
  if (!canonical) return undefined;
  return CONTRACT_TYPE_ALIAS[canonical];
};

function normalizeRow(row: Record<string, unknown>, mapping: MappingJson, defaults: { status?: string; source?: string; organization_id: string }): { payload?: LeadImportPayload; errors: string[] } {
  const get = (field: string) => {
    const columnKey = mapping[field];
    if (!columnKey) return undefined;
    return row[columnKey];
  };
  const title = toText(get("title"));
  const errors: string[] = [];
  if (!title) {
    errors.push("title: ausente");
    return { payload: undefined, errors };
  }
  const payload: LeadImportPayload = { title, organization_id: defaults.organization_id };
  const description = toText(get("description"));
  if (description) payload.description = description;
  payload.status = normalizeStatus(toText(get("status"))) ?? defaults.status ?? null;
  payload.source = normalizeSource(toText(get("source")), defaults.source) ?? null;
  const value = parseNumber(get("value"));
  if (value !== undefined) payload.value = value;
  const contractValue = parseNumber(get("contract_value"));
  if (contractValue !== undefined) payload.contract_value = contractValue;
  const contractMonths = parseInteger(get("contract_months"));
  if (contractMonths !== undefined) payload.contract_months = contractMonths;
  const contractType = normalizeContractType(toText(get("contract_type")));
  if (contractType) payload.contract_type = contractType;
  const priority = normalizePriority(toText(get("priority")));
  if (priority) payload.priority = priority;
  const expectedClose = toIsoDate(toText(get("expected_close_date")));
  if (expectedClose) payload.expected_close_date = expectedClose;
  const nextFollowUp = toIsoDate(toText(get("next_follow_up_date")));
  if (nextFollowUp) payload.next_follow_up_date = nextFollowUp;
  const lastContact = toIsoDate(toText(get("last_contact_date")));
  if (lastContact) payload.last_contact_date = lastContact;
  const dueDate = toIsoDate(toText(get("due_date")));
  if (dueDate) payload.due_date = dueDate;
  const leadScore = parseInteger(get("lead_score"));
  if (leadScore !== undefined) payload.lead_score = clampPercentage(leadScore) ?? null;
  const conversion = parseNumber(get("conversion_probability"));
  if (conversion !== undefined) payload.conversion_probability = clampPercentage(conversion) ?? null;
  const productInterest = toText(get("product_interest"));
  if (productInterest) payload.product_interest = productInterest;
  const sourceDetail = toText(get("lead_source_detail"));
  if (sourceDetail) payload.lead_source_detail = sourceDetail;
  const campaign = toText(get("campaign_id"));
  if (campaign) payload.campaign_id = campaign;
  const externalLead = toText(get("external_lead_id"));
  if (externalLead) payload.external_lead_id = externalLead;
  const adset = toText(get("adset_id"));
  if (adset) payload.adset_id = adset;
  const ad = toText(get("ad_id"));
  if (ad) payload.ad_id = ad;
  const closedWon = toIsoDate(toText(get("closed_won_at")));
  if (closedWon) payload.closed_won_at = closedWon;
  const closedLost = toIsoDate(toText(get("closed_lost_at")));
  if (closedLost) payload.closed_lost_at = closedLost;
  const lostReason = toText(get("lost_reason"));
  if (lostReason) payload.lost_reason = lostReason;

  // Extract custom fields
  const customFields: Record<string, unknown> = {};
  Object.keys(mapping).forEach((key) => {
    if (key.startsWith("custom_fields.")) {
      const fieldName = key.replace("custom_fields.", "");
      const value = get(key);
      if (value !== undefined && value !== null && value !== "") {
         customFields[fieldName] = value;
      }
    }
  });
  if (Object.keys(customFields).length > 0) {
    payload.custom_fields = customFields;
  }

  return { payload, errors };
}

serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const t0 = Date.now();
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente. Verifique PROJECT_URL e SERVICE_ROLE_KEY.", reason: "missing_config" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const {
      organization_id,
      user_id,
      source_file_name,
      source_file_url,
      source_file_hash,
      sheet_name,
      mapping_json,
      rows,
      defaults,
      mode,
    } = body ?? {};

    if (!organization_id || !mapping_json) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes.", reason: "missing_params" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma linha para importar.", reason: "empty_rows" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const MAX_ROWS = 5000;
    if (rows.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `Limite de ${MAX_ROWS} linhas excedido. Divida o arquivo.`, reason: "rows_limit_exceeded" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const mapping: MappingJson = mapping_json as MappingJson;
    const defaultsObj: { status?: string; source?: string; organization_id: string } = {
      status: (defaults?.status as string) ?? undefined,
      source: (defaults?.source as string) ?? undefined,
      organization_id,
    };

    const batchInsert = await supabase
      .from("lead_import_batches")
      .insert({
        organization_id,
        user_id: user_id ?? null,
        source_file_name: source_file_name ?? null,
        source_file_url: source_file_url ?? null,
        source_file_hash: source_file_hash ?? null,
        sheet_name: sheet_name ?? null,
        mapping_json: mapping,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (batchInsert.error) {
      return new Response(JSON.stringify({ error: batchInsert.error.message, reason: "batch_insert_failed" }), { status: 500, headers: corsHeaders });
    }
    const batch_id = batchInsert.data.id as string;

    const inputRows: Record<string, unknown>[] = Array.isArray(rows) ? rows : [];
    const normalized: { payload?: LeadImportPayload; errors: string[]; original: Record<string, unknown>; extras?: Record<string,string> }[] = inputRows.map((r) => {
      const { payload, errors } = normalizeRow(r, mapping, defaultsObj);
      const extras: Record<string,string> = {};
      const getExtra = (k: string) => {
        const col = (mapping as any)[k];
        if (!col) return undefined;
        const v = r[col];
        return v === undefined || v === null ? undefined : String(v);
      };
      const email = getExtra('email'); if (email) extras.email = email;
      const phone = getExtra('phone'); if (phone) extras.phone = phone;
      const adsetName = getExtra('adset_name'); if (adsetName) extras.adset_name = adsetName;
      const adName = getExtra('ad_name'); if (adName) extras.ad_name = adName;
      return { payload, errors, original: r, extras: Object.keys(extras).length ? extras : undefined };
    });

    const toImport = normalized.filter((n) => n.payload).map((n) => n.payload!) as LeadImportPayload[];
    let insertedIds: string[] = [];
    if (toImport.length > 0) {
      // Auto-set closed_won_at when status is fechado_ganho (server-side parity)
      let finalPayload = toImport.map((p, idx) => {
        const base = {
          ...p,
          closed_won_at: p.status === "fechado_ganho" && !p.closed_won_at ? new Date().toISOString() : p.closed_won_at ?? null,
        } as LeadImportPayload;
        const extras = normalized[idx]?.extras ?? {};
        const metaDetail = [
          extras.email ? `email:${extras.email}` : null,
          extras.phone ? `phone:${extras.phone}` : null,
          extras.adset_name ? `adset:${extras.adset_name}` : null,
          extras.ad_name ? `ad:${extras.ad_name}` : null,
        ].filter(Boolean).join("; ");
        if (metaDetail) (base as any).lead_source_detail = base.lead_source_detail ? `${base.lead_source_detail}; ${metaDetail}` : metaDetail;
        return base;
      });

      if (mode === 'basic_only') {
        finalPayload = finalPayload.map((p)=>({
          title: p.title,
          source: p.source ?? defaultsObj.source ?? null,
          organization_id: defaultsObj.organization_id,
          lead_source_detail: (p as any).lead_source_detail ?? null,
          status: defaultsObj.status ?? null,
          value: null,
        }) as LeadImportPayload);
      }
      const { data, error } = await supabase
        .from("leads")
        .insert(finalPayload)
        .select("id");
      if (error) {
        const errPayload = {
          error: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          reason: "bulk_insert_failed",
        };
        console.error(JSON.stringify({ event: "import_leads_insert_failed", batch_id, ...errPayload, payload_count: finalPayload.length }));
        // Mark whole batch as skipped if insert fails at bulk-level
        const rowsAudit = normalized.map((n) => ({
          batch_id,
          original_values: n.original,
          normalized_values: n.payload ?? null,
          status: "skipped",
          errors: ["insert_failed:", error.message],
          lead_id: null,
        }));
        await supabase.from("lead_import_rows").insert(rowsAudit);
        await supabase
          .from("lead_import_batches")
          .update({
            row_count: inputRows.length,
            imported_count: 0,
            skipped_count: inputRows.length,
            error_count: inputRows.length,
            completed_at: new Date().toISOString(),
          })
          .eq("id", batch_id);
        return new Response(JSON.stringify({ success: false, batch_id, imported: 0, skipped: inputRows.length, ...errPayload }), { status: 500, headers: corsHeaders });
      }
      insertedIds = (data ?? []).map((r: any) => r.id as string);
    }

    // Build audit rows
    const rowsAudit = normalized.map((n, idx) => ({
      batch_id,
      original_values: n.original,
      normalized_values: n.payload ?? null,
      status: n.payload ? "imported" : "skipped",
      errors: n.errors.length ? n.errors : null,
      lead_id: n.payload ? insertedIds[idx] ?? null : null,
    }));
    await supabase.from("lead_import_rows").insert(rowsAudit as any);

    const importedCount = toImport.length;
    const skippedCount = normalized.length - importedCount;
    const errorCount = normalized.reduce((acc, n) => acc + (n.errors.length ? 1 : 0), 0);

    await supabase
      .from("lead_import_batches")
      .update({
        row_count: normalized.length,
        imported_count: importedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch_id);

    const t1 = Date.now();
    console.log(JSON.stringify({ event: "import_leads", batch_id, rows: normalized.length, imported: importedCount, skipped: skippedCount, durationMs: t1 - t0 }));
    return new Response(
      JSON.stringify({ success: true, batch_id, imported: importedCount, skipped: skippedCount, error_count: errorCount, lead_ids: insertedIds }),
      { status: 200, headers: corsHeaders },
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(JSON.stringify({ event: "import_leads_error", message: msg }));
    return new Response(JSON.stringify({ error: msg, reason: "unexpected" }), { status: 500, headers: corsHeaders });
  }
});
