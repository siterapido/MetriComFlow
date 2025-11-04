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
import { Loader2 } from "lucide-react";
import { useSimpleInvite } from "@/hooks/useSimpleInvite";
import { useUserPermissions } from "@/hooks/useUserPermissions";

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
  const { inviteUser, isInviting } = useSimpleInvite();
  const { data: permissions } = useUserPermissions();

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
    try {
      await inviteUser(values);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
          <DialogDescription>
            Envie um convite por email. O novo membro receberá um link para se registrar.
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
                      disabled={isInviting}
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
                      disabled={isInviting}
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
                      disabled={isInviting}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isInviting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isInviting ? "Enviando..." : "Enviar convite"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
