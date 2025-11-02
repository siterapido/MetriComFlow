import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wand2, ImageUp, UploadCloud, X } from "lucide-react";

type LeadForm = Tables<"lead_forms">;
type LeadFormField = Tables<"lead_form_fields">;

interface LeadFormBuilderDrawerProps {
  form: LeadForm;
  open: boolean;
  onClose: () => void;
}

interface CreateFieldInput {
  label: string;
  key: string;
  type: LeadFormField["type"];
  placeholder?: string;
  helpText?: string;
  options?: string;
  isRequired: boolean;
  defaultValue?: string;
}

const FIELD_TYPE_OPTIONS: Array<{ value: LeadFormField["type"]; label: string }> = [
  { value: "text", label: "Texto curto" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Lista suspensa" },
  { value: "multiselect", label: "Múltipla escolha" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Opção única" },
  { value: "date", label: "Data" },
  { value: "hidden", label: "Campo oculto" },
];

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toSlug(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const metaSchema = z.object({
  name: z.string().min(3, "Mínimo de 3 caracteres"),
  description: z.string().max(280, "Máximo de 280").nullable().optional(),
  successMessage: z.string().max(160, "Máximo de 160").nullable().optional(),
  webhookUrl: z.string().url("URL inválida").nullable().optional().or(z.literal("")),
  redirectUrl: z.string().url("URL inválida").nullable().optional().or(z.literal("")),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use minúsculas, números e hífens")
    .min(3, "Mínimo de 3")
    .max(120, "Máximo de 120")
    .optional(),
  isActive: z.boolean().optional(),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  bannerUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});
type MetaValues = z.infer<typeof metaSchema>;

function parseOptions(options?: string): LeadFormField["options"] {
  if (!options) return [];
  const lines = options
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines.map((line) => {
    if (line.includes("|")) {
      const [label, value] = line.split("|").map((part) => part.trim());
      return { label, value: value || slugifyKey(label) };
    }
    return { label: line, value: slugifyKey(line) };
  });

  return parsed;
}

export const LeadFormBuilderDrawer = ({ form, open, onClose }: LeadFormBuilderDrawerProps) => {
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Bucket resolution (env override + sensible fallbacks)
  const DEFAULT_BUCKET = (import.meta as any)?.env?.VITE_LEAD_FORM_ASSETS_BUCKET?.toString().trim() || "lead-form-assets";
  const BUCKET_CANDIDATES = useMemo(() => {
    const list = [DEFAULT_BUCKET, "public", "assets", "attachments"];
    // Ensure uniqueness
    return Array.from(new Set(list.filter(Boolean)));
  }, [DEFAULT_BUCKET]);

  async function uploadAsset(file: File, kind: "logo" | "banner"): Promise<string> {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const folder = `${form.organization_id || form.owner_profile_id || "public"}/${form.id}`;
    const path = `${folder}/${Date.now()}-${kind}-${safe}`;

    let lastErr: unknown = null;
    for (const bucket of BUCKET_CANDIDATES) {
      try {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      } catch (err: any) {
        lastErr = err;
        // Continue trying next bucket only if bucket is missing
        const msg = String(err?.message || "").toLowerCase();
        if (!msg.includes("bucket not found") && err?.status !== 404) {
          // Other errors: stop here
          break;
        }
      }
    }
    throw lastErr ?? new Error("Falha ao enviar arquivo.");
  }

  // Meta form (configurações do formulário)
  const metaForm = useForm<MetaValues>({
    defaultValues: {
      name: form.name ?? "",
      description: (form as any).description ?? "",
      successMessage: (form as any).success_message ?? "",
      webhookUrl: (form as any).webhook_url ?? "",
      redirectUrl: (form as any).redirect_url ?? "",
      slug: (form as any).slug ?? toSlug(form.name ?? ""),
      isActive: Boolean((form as any).is_active),
      logoUrl: ((form as any).theme?.branding?.logoUrl as string) ?? "",
      bannerUrl: ((form as any).theme?.branding?.bannerUrl as string) ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    metaForm.reset({
      name: form.name ?? "",
      description: (form as any).description ?? "",
      successMessage: (form as any).success_message ?? "",
      webhookUrl: (form as any).webhook_url ?? "",
      redirectUrl: (form as any).redirect_url ?? "",
      slug: (form as any).slug ?? toSlug(form.name ?? ""),
      isActive: Boolean((form as any).is_active),
      logoUrl: ((form as any).theme?.branding?.logoUrl as string) ?? "",
      bannerUrl: ((form as any).theme?.branding?.bannerUrl as string) ?? "",
    });
  }, [open, form, metaForm]);

  const updateMeta = useMutation({
    mutationFn: async (values: MetaValues) => {
      const branding = {
        logoUrl: values.logoUrl?.toString().trim() || null,
        bannerUrl: values.bannerUrl?.toString().trim() || null,
      } as const;

      const currentTheme =
        (form as any).theme && typeof (form as any).theme === "object" ? ((form as any).theme as Record<string, unknown>) : {};

      const payload: Record<string, unknown> = {
        name: values.name,
        description: values.description?.toString().trim() || null,
        success_message: values.successMessage?.toString().trim() || null,
        webhook_url: values.webhookUrl?.toString().trim() || null,
        redirect_url: values.redirectUrl?.toString().trim() || null,
        is_active: values.isActive ?? (form as any).is_active ?? true,
        theme: {
          ...(currentTheme || {}),
          branding: {
            ...(typeof (currentTheme as any).branding === "object" ? (currentTheme as any).branding : {}),
            logoUrl: branding.logoUrl,
            bannerUrl: branding.bannerUrl,
          },
        },
      };
      if (values.slug && values.slug.trim()) payload.slug = values.slug.trim();

      let attempt = { ...payload } as Record<string, unknown>;
      for (let i = 0; i < 3; i++) {
        const { error } = await supabase.from("lead_forms").update(attempt).eq("id", form.id);
        if (!error) return;
        const code = (error as any)?.code ?? "";
        const message = String((error as any)?.message ?? "");
        const match = message.match(/Could not find the '([^']+)' column/i);
        if (code === "PGRST204" && match && match[1] && attempt.hasOwnProperty(match[1])) {
          delete (attempt as any)[match[1]];
          continue;
        }
        throw error;
      }
      throw new Error("Falha ao atualizar");
    },
    onSuccess: () => {
      toast.success("Configurações do formulário salvas.");
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
    },
    onError: (err: any) => {
      const code = String(err?.code ?? "");
      let message = String(err?.message ?? err);
      if (code === "23505") message = "Você já tem um formulário com esse slug. Escolha outro.";
      toast.error(message);
    },
  });

  const { data: fields, isLoading } = useQuery<LeadFormField[]>({
    queryKey: ["lead-form-fields", form.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_form_fields")
        .select("*")
        .eq("form_id", form.id)
        .order("order_index");

      if (error) {
        const status = (error as any)?.status ?? 0;
        const message = String((error as any)?.message ?? "");
        if (status === 404 || /not found|does not exist|relation/i.test(message)) {
          return [] as LeadFormField[];
        }
        throw error;
      }

      return (data ?? []) as LeadFormField[];
    },
  });

  const createFieldForm = useForm<CreateFieldInput>({
    defaultValues: {
      label: "",
      key: "",
      type: "text",
      placeholder: "",
      helpText: "",
      options: "",
      isRequired: true,
      defaultValue: "",
    },
  });

  const watchedLabel = createFieldForm.watch("label");
  const watchedType = createFieldForm.watch("type");

  useEffect(() => {
    const currentKey = createFieldForm.getValues("key");
    if (!currentKey || currentKey.length === 0) {
      createFieldForm.setValue("key", slugifyKey(watchedLabel ?? ""));
    }
  }, [watchedLabel, createFieldForm]);

  const createFieldMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"lead_form_fields">) => {
      const { error } = await supabase.from("lead_form_fields").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campo adicionado ao formulário.");
      createFieldForm.reset({
        label: "",
        key: "",
        type: watchedType,
        placeholder: "",
        helpText: "",
        options: "",
        isRequired: true,
        defaultValue: "",
      });
      queryClient.invalidateQueries({ queryKey: ["lead-form-fields", form.id] });
    },
    onError: (error) => {
      console.error("[LeadFormBuilder] create field error", error);
      toast.error("Não foi possível criar o campo. Tente novamente.");
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (payload: TablesUpdate<"lead_form_fields"> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("lead_form_fields").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-form-fields", form.id] });
    },
    onError: (error) => {
      console.error("[LeadFormBuilder] update field error", error);
      toast.error("Não foi possível atualizar o campo.");
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from("lead_form_fields").delete().eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campo removido.");
      queryClient.invalidateQueries({ queryKey: ["lead-form-fields", form.id] });
    },
    onError: (error) => {
      console.error("[LeadFormBuilder] delete field error", error);
      toast.error("Não foi possível remover o campo.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lead_forms")
        .update({ last_published_at: new Date().toISOString() })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formulário publicado. As alterações já estão disponíveis na versão pública.");
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
    },
    onError: (error) => {
      console.error("[LeadFormBuilder] publish form error", error);
      toast.error("Não foi possível publicar o formulário.");
    },
  });

  const onCreateField = createFieldForm.handleSubmit((values) => {
    if (!values.label || !values.key) {
      toast.error("Informe nome e identificador para o campo.");
      return;
    }

    const existingKeys = new Set((fields ?? []).map((field) => field.key));
    const candidateKey = slugifyKey(values.key);
    if (existingKeys.has(candidateKey)) {
      toast.error("Já existe um campo com esse identificador. Escolha outro.");
      return;
    }

    const maxOrder = fields?.reduce((max, field) => Math.max(max, field.order_index ?? 0), 0) ?? 0;
    const options = parseOptions(values.options);
    const validations: Record<string, unknown> = {};

    if (values.type === "hidden" && values.defaultValue) {
      validations.defaultValue = values.defaultValue;
    }

    if (values.type === "checkbox") {
      validations.defaultValue = values.defaultValue === "true";
    }

    createFieldMutation.mutate({
      form_id: form.id,
      key: candidateKey,
      label: values.label.trim(),
      type: values.type,
      is_required: values.isRequired,
      placeholder: values.placeholder?.trim() || null,
      help_text: values.helpText?.trim() || null,
      options: options.length > 0 ? options : [],
      validations,
      order_index: maxOrder + 10,
    });
  });

  const onToggleRequired = (field: LeadFormField, checked: boolean) => {
    updateFieldMutation.mutate({ id: field.id, is_required: checked });
  };

  const onRemoveField = (field: LeadFormField) => {
    deleteFieldMutation.mutate(field.id);
  };

  const fieldList = useMemo(() => fields ?? [], [fields]);

  // Adicionar campos recomendados (Nome, Empresa, Email, Telefone)
  const addRecommendedFields = useMutation({
    mutationFn: async () => {
      const existing = new Set((fieldList ?? []).map((f) => f.key));
      const templates: Array<Omit<TablesInsert<"lead_form_fields">, "form_id">> = [
        {
          key: "full_name",
          label: "Nome",
          type: "text",
          is_required: true,
          placeholder: "Ex: Ana Souza",
          help_text: "Informe o nome do lead",
          options: [],
          validations: {},
          crm_field: "full_name",
          meta_field: "full_name",
          order_index: 0, // definido abaixo
        },
        {
          key: "company",
          label: "Empresa",
          type: "text",
          is_required: false,
          placeholder: "Nome da empresa",
          help_text: null,
          options: [],
          validations: {},
          crm_field: "company",
          meta_field: "company_name",
          order_index: 0, // definido abaixo
        },
        {
          key: "email",
          label: "Email",
          type: "email",
          is_required: true,
          placeholder: "email@empresa.com",
          help_text: "Usado para follow-up e notificações",
          options: [],
          validations: {},
          crm_field: "email",
          meta_field: "email",
          order_index: 0, // definido abaixo
        },
        {
          key: "phone",
          label: "Telefone / WhatsApp",
          type: "phone",
          is_required: true,
          placeholder: "(11) 99999-9999",
          help_text: "Inclua DDD para contato via WhatsApp",
          options: [],
          validations: {},
          crm_field: "phone",
          meta_field: "phone_number",
          order_index: 0, // definido abaixo
        },
      ];

      const candidates = templates.filter((t) => !existing.has(t.key));
      if (candidates.length === 0) return;

      const maxOrder = fieldList.reduce((max, f) => Math.max(max, f.order_index ?? 0), 0) ?? 0;
      const payload = candidates.map((t, idx) => ({
        ...t,
        form_id: form.id,
        order_index: maxOrder + (idx + 1) * 10,
      })) as TablesInsert<"lead_form_fields">[];

      const { error } = await supabase.from("lead_form_fields").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campos recomendados adicionados.");
      queryClient.invalidateQueries({ queryKey: ["lead-form-fields", form.id] });
    },
    onError: (err) => {
      console.error("[LeadFormBuilder] add recommended fields", err);
      toast.error("Não foi possível adicionar os campos recomendados.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">{form.name}</DialogTitle>
          <DialogDescription>Edite configurações e gerencie campos do formulário.</DialogDescription>
        </DialogHeader>

        <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto p-4 md:grid-cols-[1fr_1.2fr]">
          {/* Configurações do formulário */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">Configurações</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta-name">Nome *</Label>
                <Input id="meta-name" {...metaForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-slug">Slug (URL)</Label>
                <Input
                  id="meta-slug"
                  {...metaForm.register("slug")}
                  onBlur={(e) => metaForm.setValue("slug", toSlug(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta-webhook">Webhook</Label>
                <Input id="meta-webhook" placeholder="https://..." {...metaForm.register("webhookUrl")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-redirect">Página de obrigado</Label>
                <Input id="meta-redirect" placeholder="https://..." {...metaForm.register("redirectUrl")} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta-description">Descrição</Label>
                <Textarea id="meta-description" rows={3} {...metaForm.register("description")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-success">Mensagem de sucesso</Label>
                <Textarea id="meta-success" rows={3} {...metaForm.register("successMessage")} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Formulário ativo</p>
                <p className="text-xs text-muted-foreground">Exibido publicamente quando ativo</p>
              </div>
              <Controller
                control={metaForm.control}
                name="isActive"
                render={({ field }) => (
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            {/* Branding */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-sm font-semibold text-foreground">Branding</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo (quadrado)</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-muted/40">
                      {metaForm.watch("logoUrl") ? (
                        <img src={metaForm.watch("logoUrl")!} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">Logo</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={(el) => (logoInputRef.current = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 6 * 1024 * 1024) {
                            toast.error("Tamanho máximo: 6MB");
                            return;
                          }
                          try {
                            setUploadingLogo(true);
                            const publicUrl = await uploadAsset(file, "logo");
                            metaForm.setValue("logoUrl", publicUrl, { shouldDirty: true });
                            toast.success("Logo enviada");
                          } catch (err: any) {
                            console.error("[LeadFormBuilder] upload logo", err);
                            const hint = `Crie um bucket público chamado \"${DEFAULT_BUCKET}\" (ou defina VITE_LEAD_FORM_ASSETS_BUCKET) em Supabase Storage.`;
                            toast.error(`Falha ao enviar a logo. ${hint}`);
                          } finally {
                            setUploadingLogo(false);
                            if (logoInputRef.current) logoInputRef.current.value = "";
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            <ImageUp className="h-4 w-4" /> Upload logo
                          </>
                        )}
                      </Button>
                      {metaForm.watch("logoUrl") && (
                        <Button type="button" size="sm" variant="outline" onClick={() => metaForm.setValue("logoUrl", "", { shouldDirty: true })}>
                          <X className="h-4 w-4" /> Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capa (banner ao topo)</Label>
                  <div className="space-y-2">
                    <div className="h-24 md:h-32 w-full overflow-hidden rounded-md border border-border bg-muted/40">
                      {metaForm.watch("bannerUrl") ? (
                        <img src={metaForm.watch("bannerUrl")!} alt="Capa" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">Capa</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={(el) => (bannerInputRef.current = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 8 * 1024 * 1024) {
                            toast.error("Tamanho máximo: 8MB");
                            return;
                          }
                          try {
                            setUploadingBanner(true);
                            const publicUrl = await uploadAsset(file, "banner");
                            metaForm.setValue("bannerUrl", publicUrl, { shouldDirty: true });
                            toast.success("Capa enviada");
                          } catch (err: any) {
                            console.error("[LeadFormBuilder] upload banner", err);
                            const hint = `Crie um bucket público chamado \"${DEFAULT_BUCKET}\" (ou defina VITE_LEAD_FORM_ASSETS_BUCKET) em Supabase Storage.`;
                            toast.error(`Falha ao enviar a capa. ${hint}`);
                          } finally {
                            setUploadingBanner(false);
                            if (bannerInputRef.current) bannerInputRef.current.value = "";
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                        {uploadingBanner ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4" /> Upload capa
                          </>
                        )}
                      </Button>
                      {metaForm.watch("bannerUrl") && (
                        <Button type="button" size="sm" variant="outline" onClick={() => metaForm.setValue("bannerUrl", "", { shouldDirty: true })}>
                          <X className="h-4 w-4" /> Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <Input
                  placeholder="https://link-da-logo..."
                  {...metaForm.register("logoUrl")}
                />
              </div>
              <p className="text-xs text-muted-foreground">A logo é exibida como círculo e a capa como um banner no topo da versão pública.</p>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={updateMeta.isPending}
                onClick={metaForm.handleSubmit((values) => updateMeta.mutate(values))}
              >
                {updateMeta.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando
                  </>
                ) : (
                  "Salvar configurações"
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Novo campo</h3>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={() => addRecommendedFields.mutate()}
                disabled={addRecommendedFields.isPending}
              >
                {addRecommendedFields.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Adicionando...
                  </>
                ) : (
                  <>Adicionar campos recomendados</>
                )}
              </Button>
            </div>
            <form onSubmit={onCreateField} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="field-label">Nome do campo</Label>
                <Input id="field-label" placeholder="Ex: Nome completo" {...createFieldForm.register("label")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-key">Identificador interno</Label>
                <Input
                  id="field-key"
                  placeholder="ex: nome_completo"
                  {...createFieldForm.register("key")}
                  onBlur={(event) => {
                    createFieldForm.setValue("key", slugifyKey(event.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Usado para mapear integrações. Mantém letras minúsculas, sem espaços.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={createFieldForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    placeholder="Ex: Informe seu nome completo"
                    {...createFieldForm.register("placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-help-text">Ajuda contextual</Label>
                  <Input
                    id="field-help-text"
                    placeholder="Texto de apoio exibido abaixo do campo"
                    {...createFieldForm.register("helpText")}
                  />
                </div>
                <Input
                  placeholder="https://link-da-capa..."
                  {...metaForm.register("bannerUrl")}
                />
              </div>

              {(watchedType === "select" || watchedType === "multiselect" || watchedType === "radio") && (
                <div className="space-y-2">
                  <Label htmlFor="field-options">Opções</Label>
                  <Textarea
                    id="field-options"
                    rows={3}
                    placeholder={"Uma opção por linha. Use o formato Nome|valor para personalizar.\nEx:\nSim|yes\nNão|no"}
                    {...createFieldForm.register("options")}
                  />
                </div>
              )}

              {(watchedType === "hidden" || watchedType === "checkbox") && (
                <div className="space-y-2">
                  <Label htmlFor="field-default-value">Valor padrão</Label>
                  <Input
                    id="field-default-value"
                    placeholder={watchedType === "checkbox" ? "true ou false" : "Valor padrão para o envio"}
                    {...createFieldForm.register("defaultValue")}
                  />
                  {watchedType === "checkbox" && (
                    <p className="text-xs text-muted-foreground">
                      Use <code>true</code> para marcado por padrão ou <code>false</code> para desmarcado.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Campo obrigatório</p>
                  <p className="text-xs text-muted-foreground">Obrigatório para envio do formulário</p>
                </div>
                <Controller
                  name="isRequired"
                  control={createFieldForm.control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Campo obrigatório" />
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createFieldMutation.isPending}>
                {createFieldMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando campo...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Adicionar campo
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Campos configurados</h3>
                <p className="text-xs text-muted-foreground">
                  Organize os campos exibidos na versão pública. Novos campos aparecem ao final da lista.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {fieldList.length} campo(s)
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando campos...
                </div>
              ) : fieldList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum campo configurado ainda. Adicione um novo campo ao lado para começar.
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldList.map((field) => (
                    <div key={field.id} className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{field.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Identificador: <code>{field.key}</code>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {field.type}
                          </Badge>
                          {field.is_required && (
                            <Badge variant="secondary" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(field.placeholder || field.help_text) && (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {field.placeholder && <p>Placeholder: {field.placeholder}</p>}
                          {field.help_text && <p>Ajuda: {field.help_text}</p>}
                        </div>
                      )}
                      {Array.isArray(field.options) && field.options.length > 0 && (() => {
                        const optionList = field.options as Array<{ label?: string; value?: string }>;
                        if (!optionList.length) {
                          return null;
                        }
                        return (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Opções</p>
                            <div className="flex flex-wrap gap-2">
                              {optionList.map((option, index) => (
                                <Badge
                                  key={(option.value ?? option.label ?? `option-${index}`)}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {option.label ?? option.value} ({option.value ?? "valor"})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <Separator className="my-4" />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.is_required ?? false}
                            onCheckedChange={(checked) => onToggleRequired(field, checked)}
                          />
                          <span className="text-xs text-muted-foreground">Campo obrigatório</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => onRemoveField(field)}
                          disabled={deleteFieldMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Última publicação:{" "}
                {form.last_published_at ? new Date(form.last_published_at).toLocaleString("pt-BR") : "Nunca publicado"}
              </p>
              <p>Publique após ajustar campos para atualizar a versão pública.</p>
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
              <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !fieldList.length}>
                {publishMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Publicando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" /> Publicar alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormBuilderDrawer;
