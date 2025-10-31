import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";

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

  return (
    <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent className="h-[90vh] max-h-[720px] overflow-hidden">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-xl font-semibold text-foreground">{form.name}</DrawerTitle>
          <DrawerDescription>
            Configure os campos exibidos na versão pública do formulário e personalize opções obrigatórias.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto p-4 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Novo campo</h3>
              <Badge variant="outline" className="text-xs">
                ID: {form.id}
              </Badge>
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

        <DrawerFooter className="border-t border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Última publicação:{" "}
                {form.last_published_at ? new Date(form.last_published_at).toLocaleString("pt-BR") : "Nunca publicado"}
              </p>
              <p>Publique após ajustar campos para atualizar a versão pública.</p>
            </div>
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline">Fechar</Button>
              </DrawerClose>
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default LeadFormBuilderDrawer;
