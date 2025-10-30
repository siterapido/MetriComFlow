import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle, CreditCard, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { formatCurrency } from "@/lib/formatters";

const paymentSchema = z.object({
  paymentMethod: z.literal("checkout"),
});

export type PaymentData = z.infer<typeof paymentSchema>;

interface PaymentStepProps {
  planName: string;
  planPrice: number;
  accountData: {
    billingName: string;
    billingEmail: string;
    billingCpfCnpj: string;
    billingPhone: string;
  };
  onSubmit: (data: PaymentData) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
}

export function PaymentStep({
  planName,
  planPrice,
  onSubmit,
  onBack,
  isLoading = false,
}: PaymentStepProps) {
  const form = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "checkout",
    },
  });

  const handleSubmit = async () => {
    await onSubmit({ paymentMethod: "checkout" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isLoading}
          >
            Voltar
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold">Pagamento</h2>
          <p className="text-muted-foreground">
            Revise as informações e finalize o pagamento
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resumo do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">{planName}</span>
            <span className="font-bold text-lg">
              {formatCurrency(planPrice)}/mês
            </span>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(planPrice)}/mês</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Finalizar Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertDescription className="text-sm text-orange-900">
              O checkout está sendo reconstruído. Em breve você poderá finalizar seu pagamento com total segurança.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Ambiente certificado com criptografia e autenticação 3D Secure quando necessário.</span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={true}
              >
                Checkout em reconstrução
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
