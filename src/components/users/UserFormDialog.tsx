import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useCreateUser, useUpdateUser, type User, type CreateUserData, type UpdateUserData } from "@/hooks/useUsers";
import { USER_TYPE_LABELS, USER_TYPE_DESCRIPTIONS, USER_TYPE_PERMISSIONS } from "@/hooks/useUserPermissions";
import type { Database } from "@/lib/database.types";

type UserType = Database["public"]["Enums"]["user_type"];

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  full_name: z.string().min(1, "Nome é obrigatório"),
  user_type: z.enum(["owner", "traffic_manager", "sales"]),
});

const updateUserSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  user_type: z.enum(["owner", "traffic_manager", "sales"]),
});

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  mode: "create" | "edit";
}

export function UserFormDialog({ open, onOpenChange, user, mode }: UserFormDialogProps) {
  const [selectedUserType, setSelectedUserType] = useState<UserType>("sales");
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const isEdit = mode === "edit";
  const schema = isEdit ? updateUserSchema : createUserSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit && user
      ? {
          full_name: user.full_name,
          user_type: user.user_type,
        }
      : {
          email: "",
          password: "",
          full_name: "",
          user_type: "sales" as UserType,
        },
  });

  useEffect(() => {
    if (user && isEdit) {
      form.reset({
        full_name: user.full_name,
        user_type: user.user_type,
      });
      setSelectedUserType(user.user_type);
    } else if (!isEdit) {
      form.reset({
        email: "",
        password: "",
        full_name: "",
        user_type: "sales",
      });
      setSelectedUserType("sales");
    }
  }, [user, isEdit, form]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          ...data,
        } as UpdateUserData);
      } else {
        await createUser.mutateAsync(data as CreateUserData);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Erro já é tratado pelo hook via toast
      // Mantém o formulário aberto para o usuário corrigir
      console.error("Erro ao salvar usuário:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {isEdit ? "Editar Usuário" : "Criar Novo Usuário"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Atualize as informações do usuário e suas permissões."
              : "Preencha os dados para criar um novo usuário no sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-foreground font-medium">
              Nome Completo
            </Label>
            <Input
              id="full_name"
              {...form.register("full_name")}
              placeholder="Digite o nome completo"
              className="bg-card border-border"
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          {/* Email (apenas ao criar) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="email@exemplo.com"
                className="bg-card border-border"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          {/* Senha (apenas ao criar) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Mínimo 6 caracteres"
                className="bg-card border-border"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          )}

          {/* Tipo de Usuário */}
          <div className="space-y-2">
            <Label htmlFor="user_type" className="text-foreground font-medium">
              Tipo de Usuário
            </Label>
            <Select
              value={form.watch("user_type")}
              onValueChange={(value) => {
                form.setValue("user_type", value as UserType);
                setSelectedUserType(value as UserType);
              }}
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Selecione o tipo de usuário" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(USER_TYPE_LABELS) as UserType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {USER_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.user_type && (
              <p className="text-sm text-destructive">
                {form.formState.errors.user_type.message}
              </p>
            )}
          </div>

          {/* Informações do Tipo Selecionado */}
          {selectedUserType && (
            <Alert className="bg-accent/20 border-border">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-medium text-foreground mb-1">
                    {USER_TYPE_DESCRIPTIONS[selectedUserType]}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-2">Permissões:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {USER_TYPE_PERMISSIONS[selectedUserType].map((permission, index) => (
                      <li key={index}>{permission}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createUser.isPending || updateUser.isPending}
            >
              {(createUser.isPending || updateUser.isPending)
                ? "Salvando..."
                : isEdit
                ? "Atualizar Usuário"
                : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
