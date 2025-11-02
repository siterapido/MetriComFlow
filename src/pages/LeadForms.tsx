import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Link2,
  Mail,
  Plug,
  Plus,
  Download,
  Webhook,
} from "lucide-react";
import { Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/lib/database.types";
import LeadFormBuilderDrawer from "@/components/forms/LeadFormBuilderDrawer";
import { useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

type LeadFormRecord = Tables<"lead_forms"> & {
  lead_form_variants?: Tables<"lead_form_variants">[];
};

const defaultFieldKeys = ["fullName", "email", "phone", "company", "message"] as const;
type DefaultFieldKey = (typeof defaultFieldKeys)[number];

const defaultFieldsSchema = z
  .object({
    fullName: z.boolean(),
    email: z.boolean(),
    phone: z.boolean(),
    company: z.boolean(),
    message: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!Object.values(value).some(Boolean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione pelo menos um campo obrigatório",
        path: [],
      });
    }
  });

const formSchema = z.object({
  name: z.string().min(3, "Informe um nome com pelo menos 3 caracteres"),
  description: z.string().max(280, "Máximo de 280 caracteres").optional(),
  webhookUrl: z
    .string()
    .url("Informe uma URL válida")
    .optional()
    .or(z.literal("")),
  redirectUrl: z
    .string()
    .url("Informe uma URL válida")
    .optional()
    .or(z.literal("")),
  successMessage: z.string().max(160, "Máximo de 160 caracteres").optional(),
  defaultFields: defaultFieldsSchema,
  adAccountId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
});

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

interface DefaultFieldTemplate {
  key: string;
  label: string;
  type: TablesInsert<"lead_form_fields">["type"];
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  crmField?: string;
  metaField?: string;
  validations?: Record<string, unknown>;
}

const DEFAULT_FIELD_TEMPLATES: Record<DefaultFieldKey, DefaultFieldTemplate> = {
  fullName: {
    key: "full_name",
    label: "Nome completo",
    type: "text",
    isRequired: true,
    placeholder: "Ex: Ana Souza",
    helpText: "Informe o nome do lead",
    crmField: "full_name",
    metaField: "full_name",
  },
  email: {
    key: "email",
    label: "Email",
    type: "email",
    isRequired: true,
    placeholder: "email@empresa.com",
    helpText: "Usado para follow-up e notificações",
    crmField: "email",
    metaField: "email",
  },
  phone: {
    key: "phone",
    label: "Telefone / WhatsApp",
    type: "phone",
    isRequired: true,
    placeholder: "(11) 99999-9999",
    helpText: "Inclua DDD para contato via WhatsApp",
    crmField: "phone",
    metaField: "phone_number",
  },
  company: {
    key: "company",
    label: "Empresa",
    type: "text",
    isRequired: false,
    placeholder: "Nome da empresa",
    crmField: "company",
    metaField: "company_name",
  },
  message: {
    key: "message",
    label: "Mensagem",
    type: "textarea",
    isRequired: false,
    placeholder: "Conte-nos sobre a sua necessidade",
    helpText: "Campo livre para detalhes sobre a oportunidade",
    crmField: "notes",
    metaField: "custom_question",
    validations: { maxLength: 600 },
  },
};

// Schema para edição básica do formulário (sem campos/variantes)
const editFormSchema = z.object({
  name: z.string().min(3, "Informe um nome com pelo menos 3 caracteres"),
  description: z.string().max(280, "Máximo de 280 caracteres").nullable().optional(),
  successMessage: z.string().max(160, "Máximo de 160 caracteres").nullable().optional(),
  webhookUrl: z.string().url("Informe uma URL válida").nullable().optional().or(z.literal("")),
  redirectUrl: z.string().url("Informe uma URL válida").nullable().optional().or(z.literal("")),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens")
    .min(3, "Mínimo de 3 caracteres")
    .max(120, "Máximo de 120 caracteres")
    .optional(),
});
type EditFormSchema = z.infer<typeof editFormSchema>;

interface CreateLeadFormPayload {
  form: TablesInsert<"lead_forms">;
  fields: Array<Omit<TablesInsert<"lead_form_fields">, "form_id">>;
  variant?: Omit<TablesInsert<"lead_form_variants">, "form_id"> | null;
}

type FormSchema = z.infer<typeof formSchema>;

const formatDate = (isoDate: string) => {
  try {
    return format(new Date(isoDate), "dd/MM/yyyy");
  } catch (error) {
    return "--";
  }
};

const copyToClipboard = async (value: string, onSuccess: () => void, onError: () => void) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      onSuccess();
    } else {
      throw new Error("Clipboard API indisponível");
    }
  } catch (error) {
    onError();
  }
};

const LeadForms = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState<LeadFormRecord | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: organization } = useActiveOrganization();
  const { user } = useAuth();
  const { data: currentProfile } = useCurrentProfile();

  const {
    data: formsData = [],
    isLoading: isLoadingForms,
    isFetching,
    isError,
    error: formsError,
  } = useQuery<LeadFormRecord[]>({
    queryKey: ["lead-forms", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      if (!organization?.id) return [] as LeadFormRecord[];
      // 1) Carrega formulários da organização (sem relacionamentos)
      let base: Tables<"lead_forms">[] = [];
      {
        const baseQuery = supabase
          .from("lead_forms")
          .select("*, owner:profiles!lead_forms_owner_profile_id_fkey(slug)")
          .order("created_at", { ascending: false });

        // Busca por organização atual OU (registros antigos sem organização e do usuário atual)
        const withDeleted = user?.id
          ? `and(organization_id.eq.${organization.id},deleted_at.is.null),and(organization_id.is.null,owner_profile_id.eq.${user.id},deleted_at.is.null)`
          : `and(organization_id.eq.${organization.id},deleted_at.is.null)`;
        const withoutDeleted = user?.id
          ? `organization_id.eq.${organization.id},and(organization_id.is.null,owner_profile_id.eq.${user.id})`
          : `organization_id.eq.${organization.id}`;

        // 1ª tentativa: filtro com deleted_at
        let { data, error } = await baseQuery.or(withDeleted);

        if (error) {
          const code = (error as any)?.code ?? "";
          const message = String((error as any)?.message ?? "");

          // Fallback: se deleted_at não existir, reexecuta sem esse filtro
          if (code === "PGRST204" && /'deleted_at'/.test(message)) {
            const res2 = await baseQuery.or(withoutDeleted);
            if (res2.error) {
              // Fallback adicional: se organization_id for ausente em schemas antigos
              const code2 = (res2.error as any)?.code ?? "";
              const msg2 = String((res2.error as any)?.message ?? "");
              if (code2 === "PGRST204" && /'organization_id'/.test(msg2)) {
                const { data: fallbackData, error: fbErr } = await supabase
                  .from("lead_forms")
                  .select("*, owner:profiles!lead_forms_owner_profile_id_fkey(slug)")
                  .order("created_at", { ascending: false });
                if (fbErr) throw fbErr;
                base = (fallbackData ?? []) as Tables<"lead_forms">[];
              } else {
                throw res2.error;
              }
            } else {
              base = (res2.data ?? []) as Tables<"lead_forms">[];
            }
          } else if (code === "PGRST204" && /'organization_id'/.test(message)) {
            // Fallback legado: sem organization_id
            const { data: fallbackData, error: fbErr } = await supabase
              .from("lead_forms")
              .select("*, owner:profiles!lead_forms_owner_profile_id_fkey(slug)")
              .order("created_at", { ascending: false });
            if (fbErr) throw fbErr;
            base = (fallbackData ?? []) as Tables<"lead_forms">[];
          } else {
            throw error;
          }
        } else {
          base = (data ?? []) as Tables<"lead_forms">[];
        }
      }

      if (base.length === 0) return [] as LeadFormRecord[];

      // 2) Carrega variantes de todos os formulários de uma vez
      const formIds = base.map((f) => f.id);
      let variants: any[] = [];
      {
        const { data, error } = await supabase
          .from("lead_form_variants")
          .select(
            "id, form_id, name, slug, campaign_source, campaign_id, meta_campaign_id, meta_ad_account_id, is_default"
          )
          .in("form_id", formIds);
        if (error) {
          const status = (error as any)?.status ?? 0;
          const message = String((error as any)?.message ?? "");
          if (status === 404 || /not found|does not exist|relation/i.test(message)) {
            variants = [];
          } else {
            throw error;
          }
        } else {
          variants = (data ?? []) as any[];
        }
      }
      const byForm: Record<string, Tables<"lead_form_variants">[]> = {};
      for (const v of variants ?? []) {
        const arr = byForm[v.form_id] || (byForm[v.form_id] = []);
        arr.push(v as unknown as Tables<"lead_form_variants">);
      }

      // 3) Anexa variantes manualmente
      const enriched: LeadFormRecord[] = base.map((f) => ({
        ...(f as LeadFormRecord),
        lead_form_variants: byForm[f.id] || [],
      }));

      return enriched;
    },
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      webhookUrl: "",
      redirectUrl: "",
      successMessage: "",
      defaultFields: {
        fullName: true,
        email: true,
        phone: true,
        company: true,
        message: true,
      },
      adAccountId: null,
      campaignId: null,
    },
  });

  const { data: adAccounts = [], isLoading: isLoadingAdAccounts } = useAdAccounts();
  const selectedAccountId = form.watch("adAccountId");
  const { data: adCampaigns = [], isLoading: isLoadingCampaigns } = useAdCampaigns(
    selectedAccountId ?? undefined,
    { enabled: Boolean(selectedAccountId) }
  );
  const selectedCampaignId = form.watch("campaignId");
  // Observa cada campo individual para garantir atualização reativa do contador
  const defaultFieldsValues = form.watch("defaultFields");
  const defaultFieldFlags = form.watch([
    "defaultFields.fullName",
    "defaultFields.email",
    "defaultFields.phone",
    "defaultFields.company",
    "defaultFields.message",
  ]);
  const selectedDefaultFieldCount = useMemo(
    () => defaultFieldFlags.filter((v) => Boolean(v)).length,
    [defaultFieldFlags],
  );
  const defaultFieldsError = (
    form.formState.errors.defaultFields as { root?: { message?: string } } | undefined
  )?.root?.message;

  // Evita loop de render: só atualiza campaignId quando necessário e usa deps estáveis
  const adCampaignIds = useMemo(() => (adCampaigns ?? []).map((c) => c.id).join(","), [adCampaigns]);
  useEffect(() => {
    const current = form.getValues("campaignId");
    if (!selectedAccountId) {
      if (current !== null) {
        form.setValue("campaignId", null, { shouldDirty: false, shouldTouch: false });
      }
      return;
    }
    if (current) {
      const exists = (adCampaigns ?? []).some((c) => c.id === current);
      if (!exists) {
        form.setValue("campaignId", null, { shouldDirty: false, shouldTouch: false });
      }
    }
  }, [selectedAccountId, adCampaignIds]);

  const createFormMutation = useMutation<Tables<"lead_forms">, unknown, CreateLeadFormPayload>({
    mutationFn: async ({ form: formPayload, fields, variant }: CreateLeadFormPayload) => {
      // Tenta inserir; se houver colunas ausentes (PGRST204), remove do payload e tenta novamente (compat com esquemas antigos)
      let createdForm: Tables<"lead_forms"> | null = null;
      let payload: Record<string, unknown> = { ...formPayload } as Record<string, unknown>;
      const attemptInsert = async () => supabase.from("lead_forms").insert(payload).select("*").single();

      for (let i = 0; i < 3; i++) {
        const { data, error } = await attemptInsert();
        if (!error) {
          createdForm = data as Tables<"lead_forms">;
          break;
        }
        const code = (error as any)?.code ?? "";
        const message = String((error as any)?.message ?? "");
        const match = message.match(/Could not find the '([^']+)' column/i);
        if (code === "PGRST204" && match && match[1] && payload.hasOwnProperty(match[1])) {
          delete (payload as any)[match[1]];
          continue;
        }
        throw error;
      }
      if (!createdForm) throw new Error("Falha ao criar formulário");

      try {
        if (fields.length > 0) {
          const formattedFields = fields.map((field) => ({
            ...field,
            form_id: createdForm.id,
          }));

          const { error: fieldsError } = await supabase.from("lead_form_fields").insert(formattedFields);
          if (fieldsError) {
            throw fieldsError;
          }
        }

        if (variant) {
          const { error: variantError } = await supabase
            .from("lead_form_variants")
            .insert({
              ...variant,
              form_id: createdForm.id,
            });

          if (variantError) {
            throw variantError;
          }
        }

        return createdForm as Tables<"lead_forms">;
      } catch (insertError) {
        await supabase.from("lead_form_fields").delete().eq("form_id", createdForm.id);
        await supabase.from("lead_form_variants").delete().eq("form_id", createdForm.id);
        await supabase.from("lead_forms").delete().eq("id", createdForm.id);
        throw insertError;
      }
    },
    onSuccess: (_createdForm, variables) => {
      const linkedCampaign = variables.variant?.campaign_id ? " e vinculado à campanha selecionada" : "";
      toast({
        title: "Formulário criado",
        description: `Campos padrão configurados${linkedCampaign}. Você pode personalizar mais tarde na aba de campos.`,
      });
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      let message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Não foi possível criar o formulário.";

      if (typeof error === "object" && error !== null && "code" in error) {
        const code = String((error as { code?: string }).code ?? "");
        if (code === "23505") {
          message = "Já existe um formulário com este nome. Ajuste o identificador e tente novamente.";
        }
      }

      toast({
        title: "Erro ao criar formulário",
        description: message,
        variant: "destructive",
      });
    },
  });


  const updateFormStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("lead_forms")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) {
        throw error;
      }

      return { id, isActive };
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["lead-forms"] });
      const previousForms = queryClient.getQueryData<LeadFormRecord[]>(["lead-forms"]);

      queryClient.setQueryData<LeadFormRecord[]>(["lead-forms"], (old) =>
        (old ?? []).map((formItem) =>
          formItem.id === id ? { ...formItem, is_active: isActive } : formItem
        ),
      );

      return { previousForms };
    },
    onError: (error, _variables, context) => {
      if (context?.previousForms) {
        queryClient.setQueryData(["lead-forms"], context.previousForms);
      }

      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Não foi possível atualizar o status do formulário.";

      toast({
        title: "Erro ao atualizar formulário",
        description: message,
        variant: "destructive",
      });
    },
    onSuccess: (_data, { isActive }) => {
      toast({
        title: "Status atualizado",
        description: isActive ? "Formulário ativado." : "Formulário desativado.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
    },
  });

  const forms = formsData;
  const loadingForms = isLoadingForms || isFetching;
  const formsErrorMessage =
    formsError && typeof formsError === "object" && "message" in formsError
      ? String((formsError as { message: string }).message)
      : "Não foi possível carregar os formulários.";

  const appBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_APP_URL;
    if (envUrl && typeof envUrl === "string" && envUrl.length > 0) {
      return envUrl.replace(/\/+$/, "");
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://app.metricomflow.com";
  }, []);

  const stats = useMemo(() => {
    const totalForms = forms.length;
    const totalSubmissions = forms.reduce((sum, formItem) => sum + (formItem.submission_count ?? 0), 0);
    const activeForms = forms.filter((formItem) => formItem.is_active).length;
    const averageSubmissions = totalForms ? Math.round(totalSubmissions / totalForms) : 0;

    return {
      totalForms,
      activeForms,
      totalSubmissions,
      averageSubmissions,
    };
  }, [forms]);

  // Lixeira: contagem e ações
  const { data: trashCount = 0 } = useQuery<number>({
    queryKey: ["lead-forms-trash-count", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { count, error } = await supabase
        .from("lead_forms")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .not("deleted_at", "is", null);
      if (error) {
        const code = (error as any)?.code ?? "";
        const message = String((error as any)?.message ?? "");
        if (code === "PGRST204" && /'deleted_at'/.test(message)) return 0;
        throw error;
      }
      return count ?? 0;
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) return;
      const { error } = await supabase
        .from("lead_forms")
        .delete()
        .eq("organization_id", organization.id)
        .not("deleted_at", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lixeira esvaziada", description: "Formulários removidos permanentemente." });
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash-count"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao esvaziar lixeira", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // tenta soft-delete; se coluna inexistente, faz hard delete
      let payload: Record<string, unknown> = { deleted_at: new Date().toISOString(), is_active: false };
      for (let i = 0; i < 3; i++) {
        const { error } = await supabase.from("lead_forms").update(payload).eq("id", id);
        if (!error) return;
        const code = (error as any)?.code ?? "";
        const message = String((error as any)?.message ?? "");
        const match = message.match(/Could not find the '([^']+)' column/i);
        if (code === "PGRST204" && match && match[1] && payload.hasOwnProperty(match[1])) {
          delete (payload as any)[match[1]];
          continue;
        }
        const { error: delErr } = await supabase.from("lead_forms").delete().eq("id", id);
        if (delErr) throw delErr;
        return;
      }
    },
    onSuccess: () => {
      toast({ title: "Formulário movido para a lixeira" });
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash-count"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao excluir", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const { data: trashList = [], isLoading: loadingTrash } = useQuery<LeadFormRecord[]>({
    queryKey: ["lead-forms-trash", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      if (!organization?.id) return [] as LeadFormRecord[];
      const { data, error } = await supabase
        .from("lead_forms")
        .select("*, owner:profiles!lead_forms_owner_profile_id_fkey(slug)")
        .eq("organization_id", organization.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) {
        const code = (error as any)?.code ?? "";
        const message = String((error as any)?.message ?? "");
        if (code === "PGRST204" && /'deleted_at'/.test(message)) return [] as LeadFormRecord[];
        throw error;
      }
      return (data ?? []) as LeadFormRecord[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_forms").update({ deleted_at: null, is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Formulário restaurado" });
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash-count"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao restaurar", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Formulário removido" });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash"] });
      queryClient.invalidateQueries({ queryKey: ["lead-forms-trash-count"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const handleCreateForm = async (values: FormSchema) => {
    if (!organization?.id) {
      toast({
        title: "Organização não encontrada",
        description: "Não foi possível identificar a organização ativa para criar o formulário.",
        variant: "destructive",
      });
      return;
    }
    const slug = toSlug(values.name);
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `form-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    const selectedFieldKeys = defaultFieldKeys.filter((key) => values.defaultFields[key]);

    const fieldsPayload: Array<Omit<TablesInsert<"lead_form_fields">, "form_id">> = selectedFieldKeys.map(
      (key, index) => {
        const template = DEFAULT_FIELD_TEMPLATES[key];
        return {
          key: template.key,
          label: template.label,
          type: template.type,
          is_required: template.isRequired,
          order_index: (index + 1) * 10,
          placeholder: template.placeholder ?? null,
          help_text: template.helpText ?? null,
          options: [],
          validations: template.validations ?? {},
          crm_field: template.crmField ?? null,
          meta_field: template.metaField ?? null,
        };
      },
    );

    const selectedAccount = values.adAccountId
      ? (adAccounts ?? []).find((account) => account.id === values.adAccountId)
      : null;
    const selectedCampaign = values.campaignId
      ? (adCampaigns ?? []).find((campaign) => campaign.id === values.campaignId)
      : null;

    const variantName = selectedCampaign?.name
      ? selectedCampaign.name
      : selectedAccount
        ? `Meta Ads - ${selectedAccount.business_name || selectedAccount.external_id}`
        : "Versão pública";

    const variantSlug = toSlug(variantName) || "versao-publica";

    const variantPayload: Omit<TablesInsert<"lead_form_variants">, "form_id"> = {
      name: variantName,
      slug: variantSlug,
      campaign_source: selectedAccount ? "meta_ads" : "manual",
      campaign_id: selectedCampaign?.id ?? null,
      meta_ad_account_id: selectedAccount?.external_id ?? null,
      meta_campaign_id: selectedCampaign?.external_id ?? null,
      meta_adset_id: null,
      meta_ad_id: null,
      theme_overrides: {},
      automation_settings: {},
      is_default: true,
    };

    const formSettings = {
      default_fields: selectedFieldKeys,
      linked_ad_account: selectedAccount?.external_id ?? null,
      linked_campaign: selectedCampaign?.external_id ?? null,
    };

    if (!user?.id) {
      toast({ title: "Sessão expirada", description: "Faça login novamente para criar o formulário.", variant: "destructive" });
      return;
    }

    await createFormMutation.mutateAsync({
      form: {
        id,
        name: values.name,
        slug,
        description: values.description?.trim() ? values.description.trim() : null,
        success_message: values.successMessage?.trim() ? values.successMessage.trim() : null,
        webhook_url: values.webhookUrl?.trim() ? values.webhookUrl.trim() : null,
        redirect_url: values.redirectUrl?.trim() ? values.redirectUrl.trim() : null,
        is_active: true,
        submission_count: 0,
        owner_profile_id: user.id,
        organization_id: organization.id,
        settings: formSettings,
      },
      fields: fieldsPayload,
      variant: variantPayload,
    });
  };

  const handleOpenBuilder = (form: LeadFormRecord) => {
    setBuilderForm(form);
  };

  const handleCloseBuilder = () => {
    setBuilderForm(null);
  };

  const handleToggleForm = async (formId: string, checked: boolean) => {
    setUpdatingId(formId);
    try {
      await updateFormStatusMutation.mutateAsync({ id: formId, isActive: checked });
    } catch (error) {
      // handled via mutation onError toast
      console.error("Failed to update form status", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopy = (value: string, successMessage: string) => {
    copyToClipboard(
      value,
      () =>
        toast({
          title: "Copiado", 
          description: successMessage,
        }),
      () =>
        toast({
          title: "Não foi possível copiar",
          description: "Copie manualmente o conteúdo exibido na tela.",
          variant: "destructive",
        })
    );
  };

  const handleExportCsv = async (formId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: "Sessão expirada", description: "Faça login novamente para exportar.", variant: "destructive" });
        return;
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/export-lead-form`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formId, format: "csv" }),
      });

      if (!res.ok) {
        const problem = await res.text();
        throw new Error(problem || `Falha na exportação (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `lead-form-${formId}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Exportação iniciada", description: "Arquivo CSV gerado com sucesso." });
    } catch (error) {
      console.error("[LeadForms] export error", error);
      toast({ title: "Erro ao exportar", description: "Tente novamente em instantes.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Formulários de Captação</h1>
          <p className="text-muted-foreground">
            Crie formulários públicos para nutrir o CRM e conecte outras plataformas via webhook.
          </p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo formulário
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Formulários</CardTitle>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{stats.totalForms}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.totalForms === 1 ? "Formulário disponível" : "Formulários cadastrados"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-2xl font-semibold">{stats.activeForms}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Formulários enviando leads em tempo real
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Envios totais</CardTitle>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{stats.totalSubmissions}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leads coletados a partir dos formulários ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média por formulário</CardTitle>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{stats.averageSubmissions}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Conversões médias nos últimos formulários criados
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="public" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="public" className="gap-2">
            <Globe className="w-4 h-4" /> Formulários públicos
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="w-4 h-4" /> Integrações externas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Formulários públicos</CardTitle>
                <CardDescription>
                  Configure a URL pública, mensagem de sucesso e o destino do lead para cada formulário.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTrashOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Lixeira
                  {trashCount > 0 ? <span className="ml-1 text-xs text-muted-foreground">({trashCount})</span> : null}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                  if (!organization?.id || !user?.id) {
                    toast({
                      title: "Sessão/Organização ausente",
                      description: "Faça login e selecione uma organização para criar o formulário.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsCreatingQuick(true);
                  try {
                    const baseName = "Formulário sem título";
                    const baseSlug = toSlug(baseName);
                    const slug = `${baseSlug}-${Math.random().toString(36).slice(2,6)}`;
                    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                      ? crypto.randomUUID()
                      : `form-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

                    let payload: Record<string, unknown> = {
                      id,
                      name: baseName,
                      slug,
                      is_active: true,
                      submission_count: 0,
                      organization_id: organization.id,
                      owner_profile_id: user.id,
                      settings: {},
                    };

                    let created: LeadFormRecord | null = null;
                    for (let i = 0; i < 3; i++) {
                      const { data, error } = await supabase.from("lead_forms").insert(payload).select("*").single();
                      if (!error) {
                        created = data as unknown as LeadFormRecord;
                        break;
                      }
                      const code = (error as any)?.code ?? "";
                      const message = String((error as any)?.message ?? "");
                      const match = message.match(/Could not find the '([^']+)' column/i);
                      if (code === "PGRST204" && match && match[1] && payload.hasOwnProperty(match[1])) {
                        delete (payload as any)[match[1]];
                        continue;
                      }
                      throw error;
                    }

                    if (created) {
                      // Inserir campos padrão: nome, email, telefone
                      try {
                        const baseKeys: DefaultFieldKey[] = ["fullName", "email", "phone"];
                        const formattedFields = baseKeys.map((key, index) => {
                          const t = DEFAULT_FIELD_TEMPLATES[key];
                          return {
                            form_id: created!.id,
                            key: t.key,
                            label: t.label,
                            type: t.type,
                            is_required: t.isRequired,
                            order_index: (index + 1) * 10,
                            placeholder: t.placeholder ?? null,
                            help_text: t.helpText ?? null,
                            options: [],
                            validations: t.validations ?? {},
                            crm_field: t.crmField ?? null,
                            meta_field: t.metaField ?? null,
                          } as TablesInsert<"lead_form_fields">;
                        });
                        const { error: fieldsErr } = await supabase.from("lead_form_fields").insert(formattedFields);
                        if (fieldsErr) {
                          // Não bloqueia o fluxo; exibe aviso leve
                          console.warn("[LeadForms] falha ao inserir campos padrão", fieldsErr);
                        }
                      } catch (e) {
                        console.warn("[LeadForms] erro inesperado ao criar campos padrão", e);
                      }

                      // Abrir o popup unificado já no formulário criado
                      setBuilderForm(created);
                      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
                    }
                  } catch (err: any) {
                    toast({ title: "Erro ao criar formulário", description: String(err?.message ?? err), variant: "destructive" });
                  } finally {
                    setIsCreatingQuick(false);
                  }
                }}
                disabled={isCreatingQuick}
                  className="gap-2"
                >
                  {isCreatingQuick ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Novo formulário
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulário</TableHead>
                    <TableHead className="hidden md:table-cell">Criado em</TableHead>
                    <TableHead className="hidden md:table-cell">Envios</TableHead>
                    <TableHead className="hidden lg:table-cell">Webhook</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                        {formsErrorMessage}
                      </TableCell>
                    </TableRow>
                  ) : loadingForms ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando formulários...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : forms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum formulário cadastrado até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    forms.map((formItem) => {
                      const profileSlug = ((formItem as any).owner?.slug as string | undefined) ?? (currentProfile?.profile?.slug ?? null);
                      const formSlug = (formItem as any).slug as string | undefined;
                      const vanityUrl = (profileSlug && formSlug)
                        ? `${appBaseUrl}/${profileSlug}/${formSlug}`
                        : (organization?.slug
                            ? `${appBaseUrl}/${organization.slug}/${formItem.id}`
                            : `${appBaseUrl}/forms/${formItem.id}`);
                      const embedCode = `<iframe src="${vanityUrl}" width="100%" height="680" style="border:0" allow="fullscreen"></iframe>`;
                      const isUpdating = updatingId === formItem.id && updateFormStatusMutation.isPending;
                      const defaultVariant =
                        formItem.lead_form_variants?.find((variant) => variant.is_default) ??
                        formItem.lead_form_variants?.[0] ??
                        null;

                      return (
                        <TableRow key={formItem.id} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{formItem.name}</p>
                              {formItem.description && (
                                <p className="text-xs text-muted-foreground max-w-lg">
                                  {formItem.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {formItem.id}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Link2 className="w-3 h-3" /> URL pública
                                </Badge>
                                {defaultVariant && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Plug className="w-3 h-3" />
                                    {defaultVariant.campaign_source === "meta_ads"
                                      ? defaultVariant.name ?? "Meta Ads"
                                      : "Versão padrão"}
                                  </Badge>
                                )}
                                {formItem.webhook_url && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Webhook className="w-3 h-3" /> Webhook ativo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatDate(formItem.created_at)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-foreground">
                            {formItem.submission_count ?? 0}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[220px] truncate">
                            {formItem.webhook_url || "Sem webhook"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                aria-label="Ativar ou desativar formulário"
                                checked={formItem.is_active}
                                disabled={isUpdating}
                                onCheckedChange={(checked) => handleToggleForm(formItem.id, checked)}
                              />
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                                {formItem.is_active ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleOpenBuilder(formItem)}
                              >
                                <FileText className="w-3 h-3" /> Editar & Campos
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleCopy(vanityUrl, "Link público copiado para a área de transferência.")}
                              >
                                <Link2 className="w-3 h-3" /> Link
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleCopy(embedCode, "Código de incorporação copiado.")}
                              >
                                <Copy className="w-3 h-3" /> Embed
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleExportCsv(formItem.id)}
                              >
                                <Download className="w-3 h-3" /> CSV
                              </Button>
                              {formItem.webhook_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleCopy(formItem.webhook_url!, "URL do webhook copiada.")}
                                >
                                  <Webhook className="w-3 h-3" /> Webhook
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={() => {
                                  if (confirm(`Enviar "${formItem.name}" para a lixeira?`)) {
                                    softDeleteMutation.mutate(formItem.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" /> Excluir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {false && (
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Lixeira</CardTitle>
                <CardDescription>
                  Formulários excluídos recentemente. Você pode restaurar ou remover permanentemente.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (trashCount <= 0) return;
                  if (confirm(`Esvaziar lixeira e remover ${trashCount} formulário(s) permanentemente?`)) {
                    emptyTrashMutation.mutate();
                  }
                }}
                disabled={trashCount <= 0 || emptyTrashMutation.isPending}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" /> Esvaziar lixeira {trashCount > 0 ? `(${trashCount})` : ""}
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulário</TableHead>
                    <TableHead className="hidden md:table-cell">Excluído em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTrash ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Carregando lixeira...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (trashList ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Lixeira vazia.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (trashList ?? []).map((formItem) => (
                      <TableRow key={formItem.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{formItem.name}</p>
                            {formItem.description && (
                              <p className="text-xs text-muted-foreground max-w-lg">{formItem.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {(formItem as any).deleted_at ? formatDate((formItem as any).deleted_at) : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              onClick={() => restoreMutation.mutate(formItem.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="w-3 h-3" /> Restaurar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                if (confirm(`Remover permanentemente "${formItem.name}"?`)) {
                                  hardDeleteMutation.mutate(formItem.id);
                                }
                              }}
                              disabled={hardDeleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" /> Excluir definitivamente
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}

          <Card className="border-dashed border-border bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" /> Compartilhamento rápido
              </CardTitle>
              <CardDescription>
                Os formulários públicos ficam disponíveis em uma URL segura gerada automaticamente. Use os botões de ação para
                compartilhar com o time ou embedar diretamente em landing pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> URL pública
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cada formulário gera um link público único. Você pode direcionar campanhas diretamente para essa URL quando não
                  houver uma landing page disponível.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Copy className="w-4 h-4 text-primary" /> Código embed
                </h3>
                <p className="text-sm text-muted-foreground">
                  Utilize o código em formato <code>&lt;iframe&gt;</code> para embutir o formulário em sites externos, como
                  WordPress, Webflow ou construtores de páginas próprios.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Plug className="w-5 h-5 text-primary" /> Elementor Pro (Webhook)
                </CardTitle>
                <CardDescription>
                  Receba leads criados no Elementor Pro diretamente no CRM via webhooks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ol className="space-y-3 list-decimal list-inside">
                  <li>Crie um formulário no Elementor Pro e adicione a ação <strong>Webhook</strong>.</li>
                  <li>Utilize a URL do webhook gerada em "Formulários Públicos" como destino.</li>
                  <li>Mapeie os campos obrigatórios (nome, e-mail, telefone e origem da campanha).</li>
                  <li>Salve e teste o envio. Cada submissão será registrada automaticamente no pipeline de leads.</li>
                </ol>
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Dica: utilize o parâmetro <code>utm_source</code> para identificar a campanha origem. Ele será salvo junto ao
                    lead capturado.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-primary" /> Outros construtores
                </CardTitle>
                <CardDescription>
                  Conecte qualquer plataforma que suporte requisições HTTP (RD Station, Zapier, Typeform, etc.).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    Configure um <strong>POST</strong> para a URL do webhook com o corpo em JSON contendo os campos do lead.
                  </li>
                  <li>
                    Inclua o cabeçalho <code>Content-Type: application/json</code> e, se necessário, um token personalizado.
                  </li>
                  <li>
                    Use o parâmetro <code>redirectUrl</code> para encaminhar o lead para uma página de obrigado após o envio.
                  </li>
                </ul>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Payload recomendado:
                  </p>
                  <pre className="mt-2 rounded-md bg-background p-3 text-xs text-left text-foreground overflow-x-auto">
{`{
  "name": "Nome do lead",
  "email": "email@exemplo.com",
  "phone": "+55 11 99999-9999",
  "source": "elementor",
  "campaign": "campanha-prospeccao-q1"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border bg-card">
              <CardHeader className="flex flex-col gap-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-primary" /> Jornada do lead
                </CardTitle>
                <CardDescription>
                  Padronize o fluxo de dados desde a captura até o acompanhamento pelas equipes de marketing e vendas.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> Captura
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Formulários públicos, integrações com Elementor Pro, Typeform e qualquer outra plataforma com suporte a
                    webhooks.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-primary" /> Automação
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Validação dos campos, enriquecimento automático e distribuição dos leads para o time responsável.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Acompanhamento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Leads são enviados para o pipeline de CRM em tempo real com indicadores de performance por origem.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5" /> Criar formulário público
            </DialogTitle>
            <DialogDescription>
              Defina as configurações iniciais. Você poderá personalizar campos e automações avançadas posteriormente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleCreateForm)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do formulário *</Label>
              <Input id="name" placeholder="Ex: Captura Campanha Meta Ads" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Explique a finalidade deste formulário para facilitar a identificação pela equipe."
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook (opcional)</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://..."
                  {...form.register("webhookUrl")}
                />
                {form.formState.errors.webhookUrl && (
                  <p className="text-sm text-destructive">{form.formState.errors.webhookUrl.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Cole a URL do seu construtor de formulários (Elementor, Typeform, Zapier...).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Página de obrigado (opcional)</Label>
                <Input
                  id="redirectUrl"
                  placeholder="https://..."
                  {...form.register("redirectUrl")}
                />
                {form.formState.errors.redirectUrl && (
                  <p className="text-sm text-destructive">{form.formState.errors.redirectUrl.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Informe a URL para redirecionar o lead após a conversão.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="successMessage">Mensagem de sucesso (opcional)</Label>
              <Textarea
                id="successMessage"
                placeholder="Ex: Obrigado pelo interesse! Em breve entraremos em contato."
                rows={2}
                {...form.register("successMessage")}
              />
              {form.formState.errors.successMessage && (
                <p className="text-sm text-destructive">{form.formState.errors.successMessage.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Campos iniciais</p>
                  <p className="text-xs text-muted-foreground">
                    Esses campos serão criados automaticamente no formulário público e vinculados ao CRM.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                  {selectedDefaultFieldCount} selecionado(s)
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {defaultFieldKeys.map((key) => {
                  const template = DEFAULT_FIELD_TEMPLATES[key];
                  const isChecked = defaultFieldsValues?.[key] ?? false;
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 transition hover:border-primary/60"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          form.setValue(`defaultFields.${key}` as const, Boolean(checked), {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                          form.trigger("defaultFields");
                        }}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {template.label}
                          {template.isRequired && <span className="ml-1 text-destructive">*</span>}
                        </p>
                        {template.placeholder && (
                          <p className="text-xs text-muted-foreground">{template.placeholder}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {defaultFieldsError && <p className="text-sm text-destructive">{defaultFieldsError}</p>}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Integração Meta Ads (opcional)</p>
                <p className="text-xs text-muted-foreground">
                  Vincule o formulário a uma conta e campanha para aplicar atribuição automática e gerar relatórios por origem.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adAccountId">Conta de anúncios conectada</Label>
                <Select
                  value={selectedAccountId ?? "none"}
                  onValueChange={(value) => {
                    form.setValue("adAccountId", value === "none" ? null : value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  disabled={isLoadingAdAccounts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma conta ou mantenha sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vinculação</SelectItem>
                    {adAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.business_name || account.external_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingAdAccounts && (
                  <p className="text-xs text-muted-foreground">Carregando contas conectadas...</p>
                )}
              </div>

              {selectedAccountId && (
                <div className="space-y-2">
                  <Label htmlFor="campaignId">Campanha Meta Ads</Label>
                  <Select
                    value={selectedCampaignId ?? "none"}
                    onValueChange={(value) => {
                      form.setValue("campaignId", value === "none" ? null : value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    disabled={isLoadingCampaigns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar campanha (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas as campanhas da conta</SelectItem>
                      {adCampaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLoadingCampaigns && (
                    <p className="text-xs text-muted-foreground">Carregando campanhas...</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={createFormMutation.isPending}>
                {createFormMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Criar formulário
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lixeira Dialog */}
      <Dialog open={isTrashOpen} onOpenChange={setIsTrashOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lixeira</DialogTitle>
            <DialogDescription>
              Formulários excluídos recentemente. Você pode restaurar ou remover permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formulário</TableHead>
                  <TableHead className="hidden md:table-cell">Excluído em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTrash ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando lixeira...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (trashList ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Lixeira vazia.
                    </TableCell>
                  </TableRow>
                ) : (
                  (trashList ?? []).map((formItem) => (
                    <TableRow key={formItem.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{formItem.name}</p>
                          {formItem.description && (
                            <p className="text-xs text-muted-foreground max-w-lg">{formItem.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {(formItem as any).deleted_at ? formatDate((formItem as any).deleted_at) : "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            onClick={() => restoreMutation.mutate(formItem.id)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="w-3 h-3" /> Restaurar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              if (confirm(`Remover permanentemente \"${formItem.name}\"?`)) {
                                hardDeleteMutation.mutate(formItem.id);
                              }
                            }}
                            disabled={hardDeleteMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" /> Excluir definitivamente
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsTrashOpen(false)}>
              Fechar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (trashCount <= 0) return;
                if (confirm(`Esvaziar lixeira e remover ${trashCount} formulário(s) permanentemente?`)) {
                  emptyTrashMutation.mutate();
                }
              }}
              disabled={trashCount <= 0 || emptyTrashMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" /> Esvaziar lixeira
              {trashCount > 0 ? <span className="ml-1 text-xs text-muted-foreground">({trashCount})</span> : null}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {builderForm && (
        <LeadFormBuilderDrawer form={builderForm} open={Boolean(builderForm)} onClose={handleCloseBuilder} />
      )}
    </div>
  );
};

export default LeadForms;
