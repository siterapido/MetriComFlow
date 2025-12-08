import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

interface TrackingData {
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  metaFormId?: string | null;
  metaLeadId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}

interface SubmitLeadFormRequest {
  formId?: string;
  variantSlug?: string | null;
  payload?: Record<string, unknown>;
  tracking?: TrackingData;
}

interface LeadFormField {
  id: string;
  key: string;
  label: string;
  type: string;
  is_required: boolean;
  order_index: number;
  validations: Record<string, unknown>;
  crm_field: string | null;
}

function findNameFieldKey(fields: LeadFormField[]): { key: string; label: string } | null {
  // Prefer explicit CRM mapping
  const byCrm = fields.find((f) => (f.crm_field || "").toLowerCase() === "full_name");
  if (byCrm) return { key: byCrm.key, label: byCrm.label };

  // Common key conventions
  const preferredKeys = new Set([
    "full_name",
    "fullname",
    "name",
    "nome",
    "nome_completo",
  ]);
  const byKey = fields.find((f) => preferredKeys.has((f.key || "").toLowerCase()));
  if (byKey) return { key: byKey.key, label: byKey.label };

  // Heuristic by label
  const byLabel = fields.find((f) => (f.label || "").toLowerCase().includes("nome"));
  if (byLabel) return { key: byLabel.key, label: byLabel.label };

  // Fallback to a generic expected key
  return { key: "full_name", label: "Nome" };
}

interface LeadFormVariant {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
  campaign_source: string | null;
  campaign_id: string | null;
  meta_ad_account_id: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  automation_settings: Record<string, unknown>;
}

interface LeadFormMetadata {
  id: string;
  name: string;
  success_message: string | null;
  is_active: boolean;
  default_owner_id: string | null;
  submission_count: number | null;
  lead_form_fields: LeadFormField[];
  lead_form_variants: LeadFormVariant[];
}

type ValidationIssue =
  | { field: string; code: "missing"; message: string }
  | { field: string; code: "invalid"; message: string };

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== null);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeValue(val)]).filter(([, val]) => val !== null),
    );
  }
  return value ?? null;
}

function collectValidationIssues(fields: LeadFormField[], payload: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of fields) {
    const rawValue = payload[field.key];
    const value = sanitizeValue(rawValue);

    if (field.is_required) {
      const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.length === 0) ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        issues.push({
          field: field.key,
          code: "missing",
          message: `O campo "${field.label}" é obrigatório.`,
        });
        continue;
      }
    }

    if (value && typeof value === "string") {
      if (field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          issues.push({
            field: field.key,
            code: "invalid",
            message: `Informe um email válido para "${field.label}".`,
          });
        }
      }

      if (field.type === "phone") {
        const digits = value.replace(/\D+/g, "");
        if (digits.length < 8) {
          issues.push({
            field: field.key,
            code: "invalid",
            message: `Informe um telefone válido para "${field.label}".`,
          });
        }
      }
    }
  }

  return issues;
}

function buildLeadTitle(form: LeadFormMetadata, payload: Record<string, unknown>): string {
  const candidateKeys = [
    "fullName",
    "nomeCompleto",
    "name",
    "nome",
    "company",
    "empresa",
    "razaoSocial",
    "email",
  ];

  for (const key of candidateKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return `${value.trim()} • ${form.name}`.slice(0, 120);
    }
  }

  return `${form.name} • Lead`.slice(0, 120);
}

function buildLeadDescription(
  fields: LeadFormField[],
  payload: Record<string, unknown>,
  tracking: TrackingData | undefined,
): string {
  const lines: string[] = [];

  for (const field of fields.sort((a, b) => a.order_index - b.order_index)) {
    const value = payload[field.key];

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`${field.label}: ${value.join(", ")}`);
      }
      continue;
    }

    if (value === null || value === undefined || value === "") {
      continue;
    }

    lines.push(`${field.label}: ${String(value)}`);
  }

  if (tracking?.utmSource || tracking?.utmMedium || tracking?.utmCampaign) {
    lines.push("--- UTM ---");
    if (tracking.utmSource) lines.push(`utm_source: ${tracking.utmSource}`);
    if (tracking.utmMedium) lines.push(`utm_medium: ${tracking.utmMedium}`);
    if (tracking.utmCampaign) lines.push(`utm_campaign: ${tracking.utmCampaign}`);
    if (tracking.utmContent) lines.push(`utm_content: ${tracking.utmContent}`);
    if (tracking.utmTerm) lines.push(`utm_term: ${tracking.utmTerm}`);
  }

  if (tracking?.referrer) {
    lines.push(`Referrer: ${tracking.referrer}`);
  }

  if (tracking?.landingPage) {
    lines.push(`Landing page: ${tracking.landingPage}`);
  }

  return lines.join("\n");
}

function computeLeadScore(flags: { hasEmail: boolean; hasPhone: boolean; hasCompany: boolean }): number {
  let score = 45;
  if (flags.hasEmail) score += 15;
  if (flags.hasPhone) score += 20;
  if (flags.hasCompany) score += 10;
  return Math.max(30, Math.min(95, score));
}

function computePriority(score: number): "low" | "medium" | "high" | "urgent" {
  if (score >= 85) return "urgent";
  if (score >= 70) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function toSnake(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || null;
}

function normalizePayload(payload: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, raw]) => {
      const value = sanitizeValue(raw);
      return [key, value];
    }),
  );
}

function extractCrmMappings(fields: LeadFormField[], payload: Record<string, unknown>) {
  const map: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.crm_field) continue;
    const key = toSnake(field.crm_field);
    if (!key) continue;
    const value = payload[field.key];
    if (value !== undefined) {
      map[key] = value;
    }
  }
  return map;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return response({ ok: true });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response({ error: "Missing Supabase configuration" }, 500);
  }

  let body: SubmitLeadFormRequest;
  try {
    body = await req.json();
  } catch (error) {
    console.error("[submit-lead-form] Invalid JSON body", error);
    return response({ error: "Invalid request body" }, 400);
  }

  if (!body.formId || typeof body.formId !== "string") {
    return response({ error: "formId is required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Carrega formulário base (sem relacionamentos) para evitar dependência de FKs no schema cache
  const { data: baseForm, error: baseError } = await supabase
    .from("lead_forms")
    .select("id, name, success_message, is_active, default_owner_id, submission_count, organization_id")
    .eq("id", body.formId)
    .maybeSingle();

  if (baseError) {
    console.error("[submit-lead-form] Error loading form base", baseError);
    return response({ error: "Formulário indisponível no momento." }, 500);
  }

  if (!baseForm || !baseForm.is_active) {
    return response({ error: "Formulário não está ativo." }, 404);
  }

  // Carrega campos e variantes separadamente
  const [{ data: fieldsRows, error: fieldsErr }, { data: variantsRows, error: variantsErr }] = await Promise.all([
    supabase
      .from("lead_form_fields")
      .select("id, key, label, type, is_required, order_index, validations, crm_field")
      .eq("form_id", baseForm.id),
    supabase
      .from("lead_form_variants")
      .select(
        "id, slug, name, is_default, campaign_source, campaign_id, meta_ad_account_id, meta_campaign_id, meta_adset_id, meta_ad_id, automation_settings"
      )
      .eq("form_id", baseForm.id),
  ]);

  if (fieldsErr) {
    console.error("[submit-lead-form] Error loading fields", fieldsErr);
    return response({ error: "Erro ao carregar configuração do formulário." }, 500);
  }

  if (variantsErr) {
    console.error("[submit-lead-form] Error loading variants", variantsErr);
    return response({ error: "Erro ao carregar configuração do formulário." }, 500);
  }

  const form: LeadFormMetadata = {
    id: baseForm.id,
    name: baseForm.name,
    success_message: baseForm.success_message,
    is_active: baseForm.is_active,
    default_owner_id: baseForm.default_owner_id,
    submission_count: baseForm.submission_count,
    lead_form_fields: (fieldsRows ?? []) as unknown as LeadFormField[],
    lead_form_variants: (variantsRows ?? []) as unknown as LeadFormVariant[],
  };

  const payload = normalizePayload(body.payload ?? {});
  const tracking = body.tracking;

  const fields = (form.lead_form_fields ?? []).sort((a, b) => a.order_index - b.order_index);
  const issues = collectValidationIssues(fields, payload);

  // Name is mandatory for all forms (business rule)
  const nameField = findNameFieldKey(fields);
  if (nameField) {
    const nm = sanitizeValue(payload[nameField.key]);
    const isEmpty =
      nm === null || nm === undefined || (typeof nm === "string" && nm.trim().length === 0);
    if (isEmpty) {
      issues.push({
        field: nameField.key,
        code: "missing",
        message: `O campo "${nameField.label || "Nome"}" é obrigatório.`,
      });
    }
  }

  const variantSlug = body.variantSlug?.toLowerCase() ?? null;
  const variants = form.lead_form_variants ?? [];
  const variant =
    variants.find((item) => item.slug.toLowerCase() === variantSlug) ??
    variants.find((item) => item.is_default) ??
    variants[0] ??
    null;

  const submissionStatus = issues.length > 0 ? "failed" : "validated";
  const submissionInsert = {
    form_id: form.id,
    variant_id: variant?.id ?? null,
    payload: payload as Json,
    errors: issues.length > 0 ? issues : null,
    status: submissionStatus,
    source: variant?.campaign_source ?? tracking?.source ?? null,
    utm_source: tracking?.utmSource ?? null,
    utm_medium: tracking?.utmMedium ?? null,
    utm_campaign: tracking?.utmCampaign ?? null,
    utm_content: tracking?.utmContent ?? null,
    utm_term: tracking?.utmTerm ?? null,
    meta_form_id: tracking?.metaFormId ?? null,
    meta_lead_id: tracking?.metaLeadId ?? null,
    fbp: tracking?.fbp ?? null,
    fbc: tracking?.fbc ?? null,
    landing_page: tracking?.landingPage ?? null,
    referrer: tracking?.referrer ?? null,
    user_agent: tracking?.userAgent ?? req.headers.get("user-agent") ?? null,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };

  const { data: submission, error: submissionError } = await supabase
    .from("lead_form_submissions")
    .insert(submissionInsert)
    .select("id")
    .maybeSingle();

  if (submissionError) {
    console.error("[submit-lead-form] Error inserting submission", submissionError);
    return response({ error: "Não foi possível registrar sua solicitação. Tente novamente." }, 500);
  }

  const submissionId = submission?.id ?? null;

  const registerEvent = async (eventType: string, eventPayload: Record<string, unknown>) => {
    if (!submissionId) return;
    const { error } = await supabase.from("lead_form_submission_events").insert({
      submission_id: submissionId,
      event_type: eventType,
      payload: eventPayload as Json,
    });
    if (error) {
      console.error("[submit-lead-form] Failed to log event", eventType, error);
    }
  };

  await registerEvent("submission_received", {
    variant_id: variant?.id ?? null,
    status: submissionStatus,
    issues,
  });

  if (issues.length > 0) {
    return response(
      {
        error: "Validation failed",
        issues,
        submissionId,
      },
      400,
    );
  }

  // Load default owner name if configured
  let assigneeName: string | null = null;
  if (form.default_owner_id) {
    const { data: owner, error: ownerError } = await supabase
      .from("team_members")
      .select("name")
      .eq("id", form.default_owner_id)
      .maybeSingle();

    if (ownerError) {
      console.warn("[submit-lead-form] Failed to load default owner", ownerError);
    } else {
      assigneeName = owner?.name ?? null;
    }
  }

  const crmMappings = extractCrmMappings(fields, payload);

  const leadScore = computeLeadScore({
    hasEmail: typeof payload.email === "string" && payload.email.length > 0,
    hasPhone: typeof payload.phone === "string" && payload.phone.length > 0,
    hasCompany: typeof payload.company === "string" && payload.company.length > 0,
  });

  const conversion_probability = Math.min(95, Math.round(leadScore * 0.7));
  const priority = computePriority(leadScore);

  const description = buildLeadDescription(fields, payload, tracking);

  // Determine campaign automatically via UTM if no explicit variant campaign
  let resolvedCampaignId: string | null = variant?.campaign_id ?? null;
  if (!resolvedCampaignId && tracking?.utmCampaign) {
    const utm = String(tracking.utmCampaign).trim();
    if (utm.length > 0) {
      const { data: foundCampaign, error: campErr } = await supabase
        .from("ad_campaigns")
        .select("id")
        .or(`external_id.eq.${utm},name.eq.${utm}`)
        .limit(1)
        .maybeSingle();
      if (!campErr && foundCampaign?.id) {
        resolvedCampaignId = foundCampaign.id as string;
      }
    }
  }

  const leadInsert = {
    title: buildLeadTitle(form, payload),
    description,
    status: "novo_lead",
    source: variant?.campaign_source === "meta_ads" ? "meta_ads" : "manual",
    lead_source_detail: variant ? `${variant.name}${tracking?.utmCampaign ? ` • ${tracking.utmCampaign}` : ""}` : null,
    campaign_id: resolvedCampaignId,
    external_lead_id: tracking?.metaLeadId ?? null,
    ad_id: variant?.meta_ad_id ?? null,
    adset_id: variant?.meta_adset_id ?? null,
    value: 0,
    assignee_id: form.default_owner_id ?? null,
    assignee_name: assigneeName,
    priority,
    lead_score: leadScore,
    conversion_probability,
    product_interest:
      (crmMappings["product_interest"] as string | undefined) ??
      (typeof payload.productInterest === "string" ? payload.productInterest : null) ??
      null,
    closed_won_at: null,
    closed_lost_at: null,
    lost_reason: null,
    // UTM tracking for attribution
    utm_source: tracking?.utmSource ?? null,
    utm_campaign: tracking?.utmCampaign ?? null,
    utm_medium: tracking?.utmMedium ?? null,
    utm_term: tracking?.utmTerm ?? null,
    utm_content: tracking?.utmContent ?? null,
    fbclid: tracking?.fbc ?? null, // Facebook Click ID for CAPI
    // Multi-tenant: vincular lead à organização proprietária do formulário
    organization_id: (baseForm as any)?.organization_id ?? null,
  };

  // Remove keys with undefined to avoid Supabase errors
  const leadPayload = Object.fromEntries(
    Object.entries(leadInsert).filter(([, value]) => value !== undefined),
  );

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert(leadPayload)
    .select("id")
    .maybeSingle();

  if (leadError) {
    console.error("[submit-lead-form] Failed to create lead", leadError);
    if (submissionId) {
      await supabase
        .from("lead_form_submissions")
        .update({ status: "failed", errors: [{ code: "lead_error", message: "Erro ao criar lead no CRM." }] })
        .eq("id", submissionId);
    }
    await registerEvent("lead_error", {
      error: leadError,
    });
    return response({ error: "Não foi possível salvar o lead no CRM. Tente novamente mais tarde." }, 500);
  }

  if (submissionId) {
    await supabase
      .from("lead_form_submissions")
      .update({ status: "synced_crm", lead_id: lead?.id ?? null })
      .eq("id", submissionId);
  }

  await registerEvent("lead_created", {
    lead_id: lead?.id ?? null,
    priority,
    assignee_id: form.default_owner_id,
  });

  // Increment submission count (best-effort)
  const nextCount = (form.submission_count ?? 0) + 1;
  const { error: countError } = await supabase
    .from("lead_forms")
    .update({ submission_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", form.id);
  if (countError) {
    console.warn("[submit-lead-form] Failed to increment submission count", countError);
  }

  const successMessage =
    form.success_message ?? "Recebemos suas informações! Em breve nossa equipe entrará em contato.";

  // Best-effort Meta Conversions API dispatch (non-blocking)
  try {
    const conversionsUrl = `${SUPABASE_URL}/functions/v1/meta-conversion-dispatch`;
    const payloadForCapi = {
      eventName: "Lead",
      eventId: submissionId ?? undefined,
      eventTime: Math.floor(Date.now() / 1000),
      email: typeof payload.email === "string" ? payload.email : null,
      phone: typeof payload.phone === "string" ? payload.phone : null,
      fbp: submissionInsert.fbp ?? null,
      fbc: submissionInsert.fbc ?? null,
      clientIpAddress: submissionInsert.ip_address ?? null,
      userAgent: submissionInsert.user_agent ?? null,
      url: submissionInsert.landing_page ?? null,
      formId: form.id,
      campaign: {
        meta_ad_account_id: variant?.meta_ad_account_id ?? null,
        meta_campaign_id: variant?.meta_campaign_id ?? null,
        meta_adset_id: variant?.meta_adset_id ?? null,
        meta_ad_id: variant?.meta_ad_id ?? null,
      },
    };
    // Fire-and-forget
    fetch(conversionsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadForCapi),
    }).catch((e) => console.warn("[submit-lead-form] CAPI dispatch failed", e));
  } catch (e) {
    console.warn("[submit-lead-form] Failed to queue CAPI dispatch", e);
  }

  return response({
    success: true,
    leadId: lead?.id ?? null,
    submissionId,
    message: successMessage,
  });
});
