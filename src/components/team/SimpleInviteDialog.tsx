import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react";
import { useInvitations } from "@/hooks/useInvitations";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useState } from "react";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["owner", "admin", "manager", "member"]),
  user_type: z.enum(["sales", "traffic_manager", "owner"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface SimpleInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * DIÁLOGO SIMPLES DE CONVITE
 *
 * Características:
 * ✅ Usa Supabase Auth nativo (seguro)
 * ✅ Sem tabela team_invitations complicada
 * ✅ Sem triggers problemáticos
 * ✅ Interface simples e clara
 */
export function SimpleInviteDialog({
  open,
  onOpenChange,
}: SimpleInviteDialogProps) {
  const { sendInvitation } = useInvitations();
  const { data: permissions } = useUserPermissions();
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  const isOwner = permissions?.isOwner ?? false;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
      user_type: "sales",
    },
  });

  const handleSubmit = async (values: InviteFormValues) => {
    setCreating(true);
    setInviteLink(null);
    setEmailSent(null);
    try {
      const res = await sendInvitation.mutateAsync({
        email: values.email,
        role: values.role,
        user_type: values.user_type,
      });
      // Mostrar o link retornado para cópia manual
      const link = (res as any)?.invite_link as string | undefined;
      const sent = (res as any)?.email_sent as boolean | undefined;
      if (link) setInviteLink(link);
      if (typeof sent === "boolean") setEmailSent(sent);
      // Não fechar automaticamente; permitir cópia do link
      form.reset();
    } catch (error) {
      console.error("Erro ao criar convite:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
          <DialogDescription>
            Gere um link de convite e (opcionalmente) envie por email. Se o email falhar, copie o link abaixo e compartilhe manualmente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="novo@empresa.com"
                      disabled={creating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Usuário e Role */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={creating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales">CRM / Vendas</SelectItem>
                        <SelectItem value="traffic_manager">
                          Gestor de Tráfego
                        </SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Acesso</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={creating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isOwner && (
                          <SelectItem value="owner">
                            Owner - Controle total
                          </SelectItem>
                        )}
                        {isOwner && (
                          <SelectItem value="admin">
                            Admin - Gerenciar equipe
                          </SelectItem>
                        )}
                        <SelectItem value="manager">
                          Manager - Gerenciar conteúdo
                        </SelectItem>
                        <SelectItem value="member">
                          Member - Acesso básico
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!isOwner && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas owners podem criar admin/owner
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resultado com link de convite */}
            {inviteLink && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Link de convite gerado</p>
                {!emailSent && emailSent !== null && (
                  <p className="text-xs text-muted-foreground">
                    Não foi possível enviar o email. Copie e compartilhe o link abaixo:
                  </p>
                )}
                <div className="flex gap-2">
                  <Input readOnly value={inviteLink} className="text-xs" />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink);
                      } catch (_) {}
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {creating ? "Gerando..." : "Gerar convite"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
