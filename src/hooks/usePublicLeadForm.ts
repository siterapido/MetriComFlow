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

export function usePublicLeadForm(formId?: string | null, variantSlug?: string | null) {
  return useQuery<PublicLeadFormData | null>({
    queryKey: ["public-lead-form", formId, variantSlug],
    enabled: Boolean(formId),
    queryFn: async () => {
      if (!formId) return null;

      const { data, error } = await supabase
        .from("lead_forms")
        .select(
          `
            id,
            name,
            description,
            success_message,
            is_active,
            theme,
            lead_form_fields (
              id,
              key,
              label,
              type,
              is_required,
              order_index,
              placeholder,
              help_text,
              options,
              validations
            ),
            lead_form_variants (
              id,
              name,
              slug,
              is_default,
              campaign_source
            )
          `,
        )
        .eq("id", formId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const fields = (data.lead_form_fields ?? [])
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

      const variants = (data.lead_form_variants ?? []).map((variant) => ({
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
        data.theme && typeof data.theme === "object" ? (data.theme as PublicLeadFormTheme) : null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        successMessage: data.success_message,
        isActive: data.is_active,
        theme,
        fields,
        variants,
        activeVariant,
      };
    },
  });
}
