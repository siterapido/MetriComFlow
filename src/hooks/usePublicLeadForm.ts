import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PublicFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "date"
  | "hidden";

export interface PublicFieldOption {
  label: string;
  value: string;
}

export interface PublicLeadFormField {
  id: string;
  key: string;
  label: string;
  type: PublicFieldType;
  isRequired: boolean;
  order: number;
  placeholder?: string | null;
  helpText?: string | null;
  options: PublicFieldOption[];
  validations: Record<string, unknown>;
}

export interface PublicLeadFormVariant {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  campaignSource?: string | null;
}

export interface PublicLeadFormTheme {
  colors?: {
    primary?: string;
    background?: string;
    card?: string;
    text?: string;
  };
  [key: string]: unknown;
}

export interface PublicLeadFormData {
  id: string;
  name: string;
  description?: string | null;
  successMessage?: string | null;
  isActive: boolean;
  theme: PublicLeadFormTheme | null;
  fields: PublicLeadFormField[];
  variants: PublicLeadFormVariant[];
  activeVariant: PublicLeadFormVariant | null;
}

function parseOptions(options: unknown): PublicFieldOption[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options
      .map((item) => {
        if (typeof item === "string") {
          return { label: item, value: item };
        }

        if (item && typeof item === "object" && "label" in item && "value" in item) {
          const label = typeof item.label === "string" ? item.label : String(item.label);
          const value = typeof item.value === "string" ? item.value : String(item.value);
          return { label, value };
        }

        return null;
      })
      .filter((item): item is PublicFieldOption => Boolean(item));
  }
  return [];
}

function toFieldType(value: unknown): PublicFieldType {
  const allowed: PublicFieldType[] = [
    "text",
    "email",
    "phone",
    "textarea",
    "select",
    "multiselect",
    "checkbox",
    "radio",
    "date",
    "hidden",
  ];

  if (typeof value === "string" && allowed.includes(value as PublicFieldType)) {
    return value as PublicFieldType;
  }
  return "text";
}

export function usePublicLeadForm(params: { formId?: string | null; profileSlug?: string | null; formSlug?: string | null; variantSlug?: string | null }) {
  const { formId, profileSlug, formSlug, variantSlug } = params;
  const enabled = Boolean(formId) || (Boolean(profileSlug) && Boolean(formSlug));
  return useQuery<PublicLeadFormData | null>({
    queryKey: ["public-lead-form", formId ?? null, profileSlug ?? null, formSlug ?? null, variantSlug ?? null],
    enabled,
    queryFn: async () => {
      // Resolve o formulário por ID ou por (profileSlug + formSlug)
      let resolvedFormId: string | null = formId ?? null;
      if (!resolvedFormId && profileSlug && formSlug) {
        // Busca profile id pelo slug
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", profileSlug)
          .maybeSingle();
        if (profErr || !prof) return null;
        const { data: lf, error: lfErr } = await supabase
          .from("lead_forms")
          .select("id")
          .eq("owner_profile_id", prof.id)
          .eq("slug", formSlug)
          .maybeSingle();
        if (lfErr || !lf) return null;
        resolvedFormId = lf.id as string;
      }
      if (!resolvedFormId) return null;
      // 1) Carrega metadados do formulário (sem relacionamentos) com fallback em caso de colunas ausentes
      let base: any = null;
      {
        const selectFull = `id, name, description, success_message, is_active, theme`;
        const { data, error } = await supabase
          .from("lead_forms")
          .select(selectFull)
          .eq("id", resolvedFormId)
          .maybeSingle();

        if (error) {
          const code = (error as any)?.code ?? "";
          const message = String((error as any)?.message ?? "");
          if (code === "PGRST204") {
            // Coluna ausente (ex.: theme). Volta para um select mínimo
            const { data: dataMin, error: errMin } = await supabase
              .from("lead_forms")
              .select(`id, name, description, success_message, is_active`)
              .eq("id", resolvedFormId)
              .maybeSingle();
            if (errMin) {
              // Se ainda falhar (ex.: tabela não existe), retorna null como indisponível
              return null;
            }
            base = dataMin;
          } else if ((error as any)?.status === 404) {
            return null;
          } else {
            throw error;
          }
        } else {
          base = data;
        }
      }
      if (!base) return null;

      // 2) Carrega campos e variantes em consultas separadas
      const [fieldsRes, variantsRes] = await Promise.all([
        supabase
          .from("lead_form_fields")
          .select(
            `id, form_id, key, label, type, is_required, order_index, placeholder, help_text, options, validations`
          )
          .eq("form_id", resolvedFormId),
        supabase
          .from("lead_form_variants")
          .select(`id, form_id, name, slug, is_default, campaign_source`)
          .eq("form_id", resolvedFormId),
      ]);

      const fieldsData = fieldsRes.error && ((fieldsRes as any).error.status === 404 || /not found|does not exist|relation/i.test(String((fieldsRes as any).error.message ?? "")))
        ? []
        : (fieldsRes.data ?? []);
      if (fieldsRes.error && fieldsData.length === 0 && (fieldsRes as any).error && (fieldsRes as any).error.status !== 404) {
        throw fieldsRes.error;
      }

      const variantsData = variantsRes.error && ((variantsRes as any).error.status === 404 || /not found|does not exist|relation/i.test(String((variantsRes as any).error.message ?? "")))
        ? []
        : (variantsRes.data ?? []);
      if (variantsRes.error && variantsData.length === 0 && (variantsRes as any).error && (variantsRes as any).error.status !== 404) {
        throw variantsRes.error;
      }

      const fields = (fieldsData ?? [])
        .map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          type: toFieldType(field.type),
          isRequired: Boolean(field.is_required),
          order: field.order_index ?? 0,
          placeholder: field.placeholder,
          helpText: field.help_text,
          options: parseOptions(field.options),
          validations: (field.validations ?? {}) as Record<string, unknown>,
        }))
        .sort((a, b) => a.order - b.order);

      const variants = (variantsData ?? []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        slug: variant.slug,
        isDefault: Boolean(variant.is_default),
        campaignSource: variant.campaign_source,
      }));

      const normalizedSlug = variantSlug?.toLowerCase() ?? null;
      const activeVariant =
        variants.find((variant) => variant.slug.toLowerCase() === normalizedSlug) ??
        variants.find((variant) => variant.isDefault) ??
        variants[0] ??
        null;

      const theme: PublicLeadFormTheme | null =
        base.theme && typeof base.theme === "object" ? (base.theme as PublicLeadFormTheme) : null;

      return {
        id: base.id,
        name: base.name,
        description: base.description,
        successMessage: base.success_message,
        isActive: base.is_active,
        theme,
        fields,
        variants,
        activeVariant,
      };
    },
  });
}
