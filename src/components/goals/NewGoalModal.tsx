import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateClientGoal, useUpdateClientGoal } from "@/hooks/useClientGoals";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";

type ClientGoal = Database['public']['Tables']['client_goals']['Row'];

const goalSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  goal_amount: z.coerce.number().min(0.01, "Meta deve ser maior que zero"),
  achieved_amount: z.coerce.number().min(0, "Valor atingido não pode ser negativo").default(0),
  period_start: z.date({
    required_error: "Data de início é obrigatória",
  }),
  period_end: z.date({
    required_error: "Data de término é obrigatória",
  }),
  status: z.enum(["Excelente", "Em dia", "Atrasado", "Crítico"]).default("Em dia"),
}).refine((data) => data.period_end > data.period_start, {
  message: "Data de término deve ser posterior à data de início",
  path: ["period_end"],
});

type GoalFormData = z.infer<typeof goalSchema>;

export interface NewGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: ClientGoal | null;
  onSuccess?: () => void;
}

export function NewGoalModal({ open, onOpenChange, goal, onSuccess }: NewGoalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createGoal = useCreateClientGoal();
  const updateGoal = useUpdateClientGoal();

  const isEditMode = !!goal;

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      company_name: goal?.company_name || "",
      goal_amount: goal?.goal_amount || 0,
      achieved_amount: goal?.achieved_amount || 0,
      period_start: goal?.period_start ? new Date(goal.period_start) : new Date(),
      period_end: goal?.period_end ? new Date(goal.period_end) : new Date(),
      status: (goal?.status as any) || "Em dia",
    },
  });

  const onSubmit = async (data: GoalFormData) => {
    try {
      setIsSubmitting(true);

      const goalData = {
        company_name: data.company_name,
        goal_amount: data.goal_amount,
        achieved_amount: data.achieved_amount,
        period_start: format(data.period_start, 'yyyy-MM-dd'),
        period_end: format(data.period_end, 'yyyy-MM-dd'),
        status: data.status,
        percentage: (data.achieved_amount / data.goal_amount) * 100,
      };

      if (isEditMode && goal) {
        await updateGoal.mutateAsync({
          id: goal.id,
          updates: goalData,
        });
        toast.success("Meta atualizada com sucesso!");
      } else {
        await createGoal.mutateAsync(goalData);
        toast.success("Meta criada com sucesso!");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} meta. Tente novamente.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Meta' : 'Nova Meta do Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize as informações da meta do cliente'
              : 'Defina uma nova meta para acompanhar o desempenho do cliente'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goal_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="achieved_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Atingido (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Excelente">Excelente</SelectItem>
                      <SelectItem value="Em dia">Em dia</SelectItem>
                      <SelectItem value="Atrasado">Atrasado</SelectItem>
                      <SelectItem value="Crítico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  <>{isEditMode ? 'Atualizar Meta' : 'Criar Meta'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
