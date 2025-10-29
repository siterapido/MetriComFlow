import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Shield, CheckCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

const paymentSchema = z.object({
  paymentMethod: z.literal("CREDIT_CARD"),
  creditCard: z.object({
    holderName: z.string().min(1, "Nome do portador é obrigatório"),
    number: z.string().min(13, "Número do cartão inválido").max(19, "Número do cartão inválido"),
    expiryMonth: z.string().min(2, "Mês inválido").max(2, "Mês inválido"),
    expiryYear: z.string().min(4, "Ano inválido").max(4, "Ano inválido"),
    ccv: z.string().min(3, "CCV inválido").max(4, "CCV inválido"),
  }),
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
  onBack: () => void;
  isLoading?: boolean;
}

export function PaymentStep({
  planName,
  planPrice,
  accountData,
  onSubmit,
  onBack,
  isLoading = false,
}: PaymentStepProps) {
  const form = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "CREDIT_CARD",
      creditCard: {
        holderName: "João da Silva",
        number: "5162306219378829",
        expiryMonth: "05",
        expiryYear: "2028",
        ccv: "318",
      },
    },
  });

  const handleSubmit = async (data: PaymentData) => {
    await onSubmit(data);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Pagamento</h2>
          <p className="text-muted-foreground">
            Complete seu pagamento para ativar o plano
          </p>
        </div>
      </div>

      {/* Plan Summary */}
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

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Dados do Cartão de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Card Holder Name */}
              <FormField
                control={form.control}
                name="creditCard.holderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Portador</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome como está no cartão"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Card Number */}
              <FormField
                control={form.control}
                name="creditCard.number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Cartão</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          field.onChange(formatted.replace(/\s/g, ""));
                        }}
                        value={formatCardNumber(field.value)}
                        maxLength={19}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiry and CCV */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="creditCard.expiryMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MM"
                          {...field}
                          maxLength={2}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCard.expiryYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="AAAA"
                          {...field}
                          maxLength={4}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCard.ccv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CCV</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          maxLength={4}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Test Data Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                    <strong>Ambiente de Teste - Cartões Válidos:</strong>
                    <br />
                    <strong>Mastercard:</strong> João da Silva | 5162306219378829 | CCV: 318 | 05/2028
                    <br />
                    <strong>Visa:</strong> Maria Santos | 4000000000000010 | CCV: 123 | 12/2028
                    <br />
                    <strong>Elo:</strong> Carlos Oliveira | 6362970000457013 | CCV: 123 | 03/2028
                    <br />
                    <strong>Hipercard:</strong> Ana Costa | 6062825624254001 | CCV: 123 | 09/2028
                    <br />
                    <em>Todos os cartões acima são válidos para teste no ambiente sandbox.</em>
                  </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Processando..."
                ) : (
                  `Finalizar Pagamento - ${formatCurrency(planPrice)}/mês`
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}