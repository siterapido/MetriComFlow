import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserCog, Mail, Lock, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile, useUpdateCurrentProfile } from "@/hooks/useCurrentProfile";
import { useToast } from "@/hooks/use-toast";
import { authHelpers, supabase } from "@/lib/supabase";

const personalSchema = z.object({
  fullName: z.string().min(3, "Informe seu nome completo."),
  avatarUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  jobTitle: z.string().optional(),
  phoneNumber: z.string().optional(),
  timezone: z.string().nonempty("Selecione um fuso horário."),
  bio: z.string().max(240, "Máximo de 240 caracteres.").optional(),
});

const timezones = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Fortaleza", label: "Nordeste (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-7)" },
];

const securitySchema = z
  .object({
    email: z.string().email("Informe um email válido."),
    password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

type PersonalFormValues = z.infer<typeof personalSchema>;
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
  const updateProfile = useUpdateCurrentProfile();
  const { toast } = useToast();

  const personalForm = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      fullName: profileData?.profile?.full_name ?? user?.user_metadata?.full_name ?? "",
      avatarUrl: profileData?.profile?.avatar_url ?? "",
      jobTitle: profileData?.metadata?.jobTitle ?? "",
      phoneNumber: profileData?.metadata?.phoneNumber ?? "",
      timezone: profileData?.metadata?.timezone ?? "America/Sao_Paulo",
      bio: profileData?.metadata?.bio ?? user?.user_metadata?.bio ?? "",
    },
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
        jobTitle: profileData.metadata?.jobTitle ?? "",
        phoneNumber: profileData.metadata?.phoneNumber ?? "",
        timezone: profileData.metadata?.timezone ?? "America/Sao_Paulo",
        bio: profileData.metadata?.bio ?? "",
      });
    }
  }, [profileData, personalForm]);

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

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
          <UserCog className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Atualize seus dados pessoais e mantenha suas credenciais seguras.
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-foreground">Informações Pessoais</CardTitle>
          <CardDescription>Esses dados ajudam seu time a reconhecer você na plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={personalForm.handleSubmit(handlePersonalSubmit)}>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage
                    src={personalForm.watch("avatarUrl") || profileData?.profile?.avatar_url || undefined}
                    alt={personalForm.watch("fullName")}
                  />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                  {getInitials(personalForm.watch("fullName") || user?.email || "MF")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Foto de perfil</p>
                <p className="text-xs text-muted-foreground/80">
                  Informe uma URL pública para que seu avatar apareça em toda a plataforma.
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatarUrl">URL da foto</Label>
              <Input id="avatarUrl" placeholder="https://..." {...personalForm.register("avatarUrl")} />
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lock className="h-5 w-5 text-primary" />
          Segurança da Conta
        </CardTitle>
        <CardDescription>Altere email, senha e gerencie sessões conectadas.</CardDescription>
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
            <p>
              Desconectaremos sessões antigas quando você alterar a senha. Em breve você poderá visualizar sessões remotas
              diretamente nesta tela.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => securityForm.reset()}>
              Limpar
            </Button>
            <Button type="submit">Atualizar credenciais</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
  );
}
