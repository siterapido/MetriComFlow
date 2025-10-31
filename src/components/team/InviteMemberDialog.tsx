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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { useInvitations } from "@/hooks/useInvitations";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useOrganizationPlanLimits } from "@/hooks/useSubscription";

const inviteSchema = z.object({
  email: z.string().email("Informe um email válido"),
  user_type: z.enum(["sales", "traffic_manager", "owner"]),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { sendInvitation, isSending } = useInvitations();
  const { data: permissions } = useUserPermissions();
  const { data: limits } = useOrganizationPlanLimits();

  const canAddUser = permissions?.canAddUser ?? true;
  const usersLimitReached = limits?.users_limit_reached ?? false;
  const subscriptionRestricted = !canAddUser && !usersLimitReached;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      user_type: "sales",
    },
  });

  const handleSubmit = async (values: InviteFormValues) => {
    try {
      await sendInvitation(values);
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
            Envie um convite por email e defina o nível de acesso do colaborador.
          </DialogDescription>
        </DialogHeader>

        {/* Limit Reached Warning */}
        {usersLimitReached && (
          <Alert className="bg-destructive/10 border-destructive">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <p className="font-semibold">Limite de usuários atingido!</p>
              <p className="text-sm mt-1">
                Você atingiu o limite de {limits?.max_users} usuários do seu plano atual (
                {limits?.plan_name}). Faça upgrade para adicionar mais membros.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onOpenChange(false);
                  window.location.href = "/planos";
                }}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Ver Planos
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {subscriptionRestricted && (
          <Alert className="bg-warning/10 border-warning">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              <p className="font-semibold">Plano com acesso limitado</p>
              <p className="text-sm mt-1">
                Regularize o pagamento ou faça upgrade para convidar novos membros para a equipe.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email corporativo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="colaborador@empresa.com"
                      autoComplete="off"
                      disabled={isSending || subscriptionRestricted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-1">
              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de usuário</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSending || subscriptionRestricted}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales">CRM / Vendas</SelectItem>
                        <SelectItem value="traffic_manager">Gestor de Tráfego</SelectItem>
                        <SelectItem value="owner">Owner (Acesso total)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>



            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending || usersLimitReached || subscriptionRestricted}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {usersLimitReached ? "Limite atingido" : subscriptionRestricted ? "Acesso bloqueado" : "Enviar convite"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
