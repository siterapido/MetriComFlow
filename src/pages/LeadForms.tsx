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
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/lib/database.types";
import LeadFormBuilderDrawer from "@/components/forms/LeadFormBuilderDrawer";
import { useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState<LeadFormRecord | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: formsData = [],
    isLoading: isLoadingForms,
    isFetching,
    isError,
    error: formsError,
  } = useQuery<LeadFormRecord[]>({
    queryKey: ["lead-forms"],
    queryFn: async () => {
      // 1) Carrega formulários (sem relacionamentos)
      const { data: forms, error: formsError } = await supabase
        .from("lead_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (formsError) throw formsError;
      const base = forms ?? [];

      if (base.length === 0) return [] as LeadFormRecord[];

      // 2) Carrega variantes de todos os formulários de uma vez
      const formIds = base.map((f) => f.id);
      const { data: variants, error: variantsError } = await supabase
        .from("lead_form_variants")
        .select("id, form_id, name, slug, campaign_source, campaign_id, meta_campaign_id, meta_ad_account_id, is_default")
        .in("form_id", formIds);

      if (variantsError) throw variantsError;
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

  useEffect(() => {
    if (!selectedAccountId) {
      form.setValue("campaignId", null);
    } else {
      const currentCampaignId = form.getValues("campaignId");
      if (currentCampaignId) {
        const exists = adCampaigns.some((campaign) => campaign.id === currentCampaignId);
        if (!exists) {
          form.setValue("campaignId", null);
        }
      }
    }
  }, [selectedAccountId, adCampaigns, form]);

  const createFormMutation = useMutation<Tables<"lead_forms">, unknown, CreateLeadFormPayload>({
    mutationFn: async ({ form: formPayload, fields, variant }: CreateLeadFormPayload) => {
      const { data: createdForm, error } = await supabase
        .from("lead_forms")
        .insert(formPayload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

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

        return createdForm;
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

  const handleCreateForm = async (values: FormSchema) => {
    const slug = toSlug(values.name);
    const id = slug || `form-${Date.now()}`;

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

    await createFormMutation.mutateAsync({
      form: {
        id,
        name: values.name,
        description: values.description?.trim() ? values.description.trim() : null,
        success_message: values.successMessage?.trim() ? values.successMessage.trim() : null,
        webhook_url: values.webhookUrl?.trim() ? values.webhookUrl.trim() : null,
        redirect_url: values.redirectUrl?.trim() ? values.redirectUrl.trim() : null,
        is_active: true,
        submission_count: 0,
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
              <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Novo formulário
              </Button>
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
                      const publicUrl = `${appBaseUrl}/forms/${formItem.id}`;
                      const embedCode = `<iframe src="${publicUrl}" width="100%" height="680" style="border:0" allow="fullscreen"></iframe>`;
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
                                <FileText className="w-3 h-3" /> Campos
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleCopy(publicUrl, "Link público copiado para a área de transferência.")}
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

      {builderForm && (
        <LeadFormBuilderDrawer form={builderForm} open={Boolean(builderForm)} onClose={handleCloseBuilder} />
      )}
    </div>
  );
};

export default LeadForms;
