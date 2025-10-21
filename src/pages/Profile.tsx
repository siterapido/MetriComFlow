import { useEffect, useMemo } from "react";
import { useForm, Controller, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Bell, KanbanSquare, UserCog, Mail, Lock, Smartphone, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile, useUpdateCurrentProfile } from "@/hooks/useCurrentProfile";
import { useUserPermissions, USER_TYPE_LABELS, USER_TYPE_PERMISSIONS } from "@/hooks/useUserPermissions";
import {
  useUserSettings,
  useUpdateUserSettings,
  type UserSettings,
} from "@/hooks/useUserSettings";
import { useToast } from "@/hooks/use-toast";
import { authHelpers, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const personalSchema = z.object({
  fullName: z.string().min(3, "Informe seu nome completo."),
  avatarUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  jobTitle: z.string().optional(),
  phoneNumber: z.string().optional(),
  timezone: z.string().nonempty("Selecione um fuso horário."),
  bio: z.string().max(240, "Máximo de 240 caracteres.").optional(),
});

const settingsSchema = z.object({
  defaultHome: z.enum(["dashboard", "leads", "leads/kanban", "metas", "meta-ads-config"]),
  notifications: z.object({
    emailLeads: z.boolean(),
    emailGoals: z.boolean(),
    emailWeeklySummary: z.boolean(),
    slackAlerts: z.boolean(),
    browserPush: z.boolean(),
  }),
  crm: z.object({
    defaultPipelineView: z.enum(["linear", "kanban"]),
    autoAssignNewLeads: z.boolean(),
    showRevenueInPipeline: z.boolean(),
    remindTasks: z.boolean(),
  }),
  metrics: z.object({
    defaultDateRange: z.enum(["7", "30", "90"]),
    showForecastCards: z.boolean(),
    highlightCAC: z.boolean(),
    preferredCurrency: z.enum(["BRL", "USD"]),
  }),
  ui: z.object({
    theme: z.enum(["system", "light", "dark"]),
    compactTables: z.boolean(),
    language: z.enum(["pt-BR", "en-US"]),
  }),
  privacy: z.object({
    shareEmailWithTeam: z.boolean(),
    sharePhoneWithTeam: z.boolean(),
    twoFactorEnabled: z.boolean(),
  }),
});

type PersonalFormValues = z.infer<typeof personalSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;

const timezones = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Fortaleza", label: "Nordeste (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-7)" },
];

const securitySchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string().min(6, "Confirme sua senha."),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não coincidem.",
});

type SecurityFormValues = z.infer<typeof securitySchema>;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function Profile() {
  const { user } = useAuth();
  const { data: profileData, isLoading: loadingProfile } = useCurrentProfile();
  const { data: settings, isLoading: loadingSettings } = useUserSettings();
  const { data: permissions } = useUserPermissions();
  const updateProfile = useUpdateCurrentProfile();
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();

  const personalForm = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      fullName: profileData?.profile?.full_name ?? user?.user_metadata?.full_name ?? "",
      avatarUrl: profileData?.profile?.avatar_url ?? "",
      jobTitle: profileData?.metadata.jobTitle ?? "",
      phoneNumber: profileData?.metadata.phoneNumber ?? "",
      timezone: profileData?.metadata.timezone ?? "America/Sao_Paulo",
      bio: profileData?.metadata.bio ?? user?.user_metadata?.bio ?? "",
    },
  });

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings ?? undefined,
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (profileData?.profile) {
      personalForm.reset({
        fullName: profileData.profile.full_name ?? "",
        avatarUrl: profileData.profile.avatar_url ?? "",
        jobTitle: profileData.metadata.jobTitle ?? "",
        phoneNumber: profileData.metadata.phoneNumber ?? "",
        timezone: profileData.metadata.timezone ?? "America/Sao_Paulo",
        bio: profileData.metadata.bio ?? "",
      });
    }
  }, [profileData, personalForm]);

  useEffect(() => {
    if (settings) {
      settingsForm.reset(settings);
    }
  }, [settings, settingsForm]);

  useEffect(() => {
    if (user?.email) {
      securityForm.setValue("email", user.email);
    }
  }, [securityForm, user?.email]);

  const handlePersonalSubmit = async (values: PersonalFormValues) => {
    await updateProfile.mutateAsync({
      fullName: values.fullName,
      avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
      jobTitle: values.jobTitle?.trim() ? values.jobTitle.trim() : null,
      phoneNumber: values.phoneNumber?.trim() ? values.phoneNumber.trim() : null,
      timezone: values.timezone,
      bio: values.bio?.trim() ? values.bio.trim() : null,
    });
  };

  const handleSettingsSubmit = async (values: SettingsFormValues) => {
    const payload: UserSettings = {
      ...values,
    };
    await updateSettings.mutateAsync(payload);
  };

  const handleSecuritySubmit = async (values: SecurityFormValues) => {
    if (!user) return;

    if (values.email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email: values.email });
      if (error) {
        toast({
          title: "Erro ao atualizar email",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Confirme seu novo email",
        description: "Enviamos um link de verificação para o novo endereço.",
      });
    }

    const { error: passwordError } = await authHelpers.updatePassword(values.password);
    if (passwordError) {
      toast({
        title: "Erro ao atualizar senha",
        description: passwordError.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Credenciais atualizadas",
      description: "Senha e email (quando alterado) atualizados com sucesso.",
    });

    securityForm.reset({
      email: values.email,
      password: "",
      confirmPassword: "",
    });
  };

  const userTypeLabel = useMemo(() => {
    if (!permissions?.userType) return "Usuário";
    return USER_TYPE_LABELS[permissions.userType] ?? "Usuário";
  }, [permissions?.userType]);

  if (loadingProfile && loadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[320px]" />
        </div>
        <Skeleton className="h-[460px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meu Perfil & Configurações</h1>
            <p className="text-muted-foreground">
              Personalize sua experiência, atualize dados pessoais e controle notificações.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm border-primary/40 text-primary">
          <Shield className="h-4 w-4" />
          {userTypeLabel}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-foreground">Informações Pessoais</CardTitle>
            <CardDescription>Atualize dados que o time visualiza ao colaborar com você.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6" onSubmit={personalForm.handleSubmit(handlePersonalSubmit)}>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarImage src={personalForm.watch("avatarUrl") || profileData?.profile?.avatar_url || undefined} alt={personalForm.watch("fullName")} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                      {getInitials(personalForm.watch("fullName") || user?.email || "MF")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Foto de perfil</p>
                    <p className="text-xs text-muted-foreground/80">
                      Informe uma URL pública ou conecte integrações futuras de avatar.
                    </p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatarUrl">URL da foto</Label>
                  <Input
                    id="avatarUrl"
                    placeholder="https://..."
                    {...personalForm.register("avatarUrl")}
                  />
                  {personalForm.formState.errors.avatarUrl && (
                    <p className="text-xs text-destructive">{personalForm.formState.errors.avatarUrl.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" placeholder="Seu nome" {...personalForm.register("fullName")} />
                  {personalForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{personalForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email corporativo</Label>
                  <Input value={user?.email ?? ""} disabled className="bg-muted/40 text-muted-foreground" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Cargo/Função</Label>
                  <Input id="jobTitle" placeholder="Ex: Gestor de Tráfego" {...personalForm.register("jobTitle")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Telefone/Whatsapp</Label>
                  <Input id="phoneNumber" placeholder="+55 11 99999-9999" {...personalForm.register("phoneNumber")} />
                </div>
                <div className="space-y-2">
                  <Label>Fuso horário padrão</Label>
                  <Controller
                    control={personalForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio curta</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder="Conte brevemente como você atua na operação e quais métricas acompanha."
                  {...personalForm.register("bio")}
                />
                {personalForm.formState.errors.bio && (
                  <p className="text-xs text-destructive">{personalForm.formState.errors.bio.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => personalForm.reset()}>
                  Descartar alterações
                </Button>
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Salvando..." : "Salvar informações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Acesso & Permissões
            </CardTitle>
            <CardDescription>Entenda o que você pode fazer dentro do MetriCom Flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Tipo de usuário</p>
              <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-3 py-1">
                {userTypeLabel}
              </Badge>
              {permissions?.userType && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Você possui acesso como <strong>{userTypeLabel}</strong>, o que garante:
                </p>
              )}
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {permissions?.userType
                  ? USER_TYPE_PERMISSIONS[permissions.userType]?.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Shield className="h-4 w-4 mt-0.5 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))
                  : null}
              </ul>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-primary" />
                Sugestões de próximos passos
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Agende um alinhamento quinzenal com o time para revisar métricas principais.</li>
                <li>• Ative alertas críticos para leads quentes e metas com risco de atraso.</li>
                <li>• Defina um responsável backup em caso de ausência prolongada.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="h-5 w-5 text-primary" />
              Preferências e Notificações
            </CardTitle>
            <CardDescription>Defina quais alertas deseja receber e como prefere visualizar CRM e métricas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)}>
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alertas do dia a dia
                </p>
                <div className="space-y-3">
                  <PreferenceToggle
                    control={settingsForm.control}
                    name="notifications.emailLeads"
                    title="Atualizações de leads por email"
                    description="Receba alertas quando um lead avançar de estágio ou ficar estagnado."
                  />
                  <PreferenceToggle
                    control={settingsForm.control}
                    name="notifications.browserPush"
                    title="Notificações no navegador"
                    description="Ative pop-ups rápidos para mudanças críticas durante o expediente."
                  />
                  <PreferenceToggle
                    control={settingsForm.control}
                    name="notifications.emailGoals"
                    title="Alertas de metas e OKRs"
                    description="Saiba quando uma meta se aproxima do prazo ou atinge marcos importantes."
                  />
                  <PreferenceToggle
                    control={settingsForm.control}
                    name="notifications.emailWeeklySummary"
                    title="Resumo gerencial semanal"
                    description="Receba aos domingos um consolidado de desempenho para iniciar a semana alinhado."
                  />
                  <PreferenceToggle
                    control={settingsForm.control}
                    name="notifications.slackAlerts"
                    title="Sincronizar alertas com Slack"
                    description="Integre com o canal #metricom-alertas para avisar o time inteiro."
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <KanbanSquare className="h-4 w-4 text-primary" />
                  CRM & Pipeline
                </p>
                <PreferenceToggle
                  control={settingsForm.control}
                  name="crm.autoAssignNewLeads"
                  title="Auto atribuir novos leads"
                  description="Distribua automaticamente leads que entram pela Meta Ads para o time ativo."
                />
                <PreferenceToggle
                  control={settingsForm.control}
                  name="crm.showRevenueInPipeline"
                  title="Mostrar previsão de receita"
                  description="Exiba valores estimados diretamente em cada cartão de lead."
                />
                <PreferenceToggle
                  control={settingsForm.control}
                  name="crm.remindTasks"
                  title="Lembretes de follow-up"
                  description="Receba alertas ao fim do dia se houver tarefas pendentes para leads."
                />

                <div className="space-y-2">
                  <Label>Visualização padrão</Label>
                  <Controller
                    control={settingsForm.control}
                    name="crm.defaultPipelineView"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kanban">Kanban (pipeline visual)</SelectItem>
                          <SelectItem value="linear">Lista (tabela)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "Salvando..." : "Salvar preferências"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" />
              Segurança da Conta
            </CardTitle>
            <CardDescription>Reforce a segurança alterando senha e controlando sessões.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={securityForm.handleSubmit(handleSecuritySubmit)}>
              <div className="space-y-2">
                <Label htmlFor="security-email" className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  Email de acesso
                </Label>
                <Input
                  id="security-email"
                  type="email"
                  placeholder="seuemail@empresa.com"
                  {...securityForm.register("email")}
                />
                <p className="text-xs text-muted-foreground">
                  Alterar o email enviará um link de verificação. O acesso atual permanece até a confirmação.
                </p>
                {securityForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{securityForm.formState.errors.email.message}</p>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input id="password" type="password" {...securityForm.register("password")} />
                  {securityForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{securityForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input id="confirmPassword" type="password" {...securityForm.register("confirmPassword")} />
                  {securityForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{securityForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Sessões ativas
                </p>
                <p>Desconectaremos sessões antigas quando você alterar a senha. Para visualizar sessões remotas, acesse as integrações em Configurações Avançadas (em breve).</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => securityForm.reset()}>
                  Limpar
                </Button>
                <Button type="submit">
                  Atualizar credenciais
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PreferenceToggleProps {
  control: Control<SettingsFormValues>;
  name: FieldPath<SettingsFormValues>;
  title: string;
  description: string;
  disabled?: boolean;
}

function PreferenceToggle({ control, name, title, description, disabled }: PreferenceToggleProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          className={cn(
            "flex items-start justify-between rounded-lg border border-border p-4 gap-4 transition-colors",
            field.value ? "bg-primary/5 border-primary/40" : "bg-background"
          )}
        >
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 pr-6">{description}</p>
          </div>
          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        </div>
      )}
    />
  );
}
