import { useMemo, useState } from "react";
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
  Webhook,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/lib/database.types";

type LeadForm = Tables<"lead_forms">;

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
});

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: formsData = [],
    isLoading: isLoadingForms,
    isFetching,
    isError,
    error: formsError,
  } = useQuery<LeadForm[]>({
    queryKey: ["lead-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
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
    },
  });

  const createFormMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"lead_forms">) => {
      const { data, error } = await supabase
        .from("lead_forms")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Formulário criado",
        description: "O formulário público está ativo e pronto para captar leads.",
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
      const previousForms = queryClient.getQueryData<LeadForm[]>(["lead-forms"]);

      queryClient.setQueryData<LeadForm[]>(["lead-forms"], (old) =>
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

    await createFormMutation.mutateAsync({
      id,
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : null,
      success_message: values.successMessage?.trim() ? values.successMessage.trim() : null,
      webhook_url: values.webhookUrl?.trim() ? values.webhookUrl.trim() : null,
      redirect_url: values.redirectUrl?.trim() ? values.redirectUrl.trim() : null,
      is_active: true,
      submission_count: 0,
    });
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
    </div>
  );
};

export default LeadForms;
