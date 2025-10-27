import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, User, Phone, Mail, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaymentMethodSelector, PaymentMethod } from "./PaymentMethodSelector";
import {
  formatCpfCnpj,
  validateCpfCnpj,
  stripNonNumeric,
  formatPhone,
  validatePhone,
  formatCEP,
  validateCEP,
} from "@/lib/cpf-cnpj-validator";

const creditCardSchema = z.object({
  holderName: z.string().min(3, "Nome impresso no cartão é obrigatório"),
  number: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 13 && val.length <= 19, {
      message: "Número do cartão inválido",
    }),
  expiry: z
    .string()
    .transform((val) => val.replace(/\s/g, ""))
    .refine((val) => /^(0[1-9]|1[0-2])\/(\d{2})$/.test(val), {
      message: "Validade inválida (MM/AA)",
    }),
  ccv: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 3 && val.length <= 4, {
      message: "CVV inválido",
    }),
});

// Use discriminated union to validate credit card fields ONLY when paymentMethod === "CREDIT_CARD"
const baseFields = {
  billingName: z.string().min(3, "Nome completo é obrigatório"),
  billingEmail: z.string().email("Email inválido"),
  billingCpfCnpj: z.string().refine(validateCpfCnpj, {
    message: "CPF/CNPJ inválido",
  }),
  billingPhone: z.string().refine(validatePhone, {
    message: "Telefone inválido (ex: (11) 98765-4321)",
  }),
  postalCode: z.string().refine(validateCEP, {
    message: "CEP inválido",
  }),
  street: z.string().min(3, "Endereço é obrigatório"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  province: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 letras (ex: SP)"),
};

const checkoutSchema = z.discriminatedUnion("paymentMethod", [
  z.object({
    ...baseFields,
    paymentMethod: z.literal("CREDIT_CARD"),
    creditCard: creditCardSchema,
  }),
  z.object({
    ...baseFields,
    paymentMethod: z.literal("PIX"),
    creditCard: z.undefined().optional(),
  }),
  z.object({
    ...baseFields,
    paymentMethod: z.literal("BOLETO"),
    creditCard: z.undefined().optional(),
  }),
]);

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  planName: string;
  planPrice: number;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CheckoutForm({ planName, planPrice, onSubmit, isLoading = false }: CheckoutFormProps) {
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      billingName: "",
      billingEmail: "",
      billingCpfCnpj: "",
      billingPhone: "",
      postalCode: "",
      street: "",
      addressNumber: "",
      complement: "",
      province: "",
      city: "",
      state: "",
      paymentMethod: "CREDIT_CARD",
      creditCard: {
        holderName: "",
        number: "",
        expiry: "",
        ccv: "",
      },
    },
  });

  // When switching to PIX/BOLETO, clear creditCard from form state to avoid hidden validation
  const currentMethod = form.watch("paymentMethod");
  if (currentMethod !== "CREDIT_CARD") {
    const cc = form.getValues("creditCard" as any);
    if (cc !== undefined) {
      // Clear only once to prevent unnecessary rerenders
      form.setValue("creditCard" as any, undefined, { shouldValidate: false, shouldDirty: false });
    }
  }

  // Auto-fetch address from CEP using ViaCEP API
  const handleCepChange = async (cep: string) => {
    const cleanCep = stripNonNumeric(cep);

    if (cleanCep.length === 8) {
      setIsFetchingAddress(true);

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          form.setValue("street", data.logradouro || "");
          form.setValue("province", data.bairro || "");
          form.setValue("city", data.localidade || "");
          form.setValue("state", data.uf || "");

          // Focus on address number after auto-fill
          setTimeout(() => {
            document.getElementById("addressNumber")?.focus();
          }, 100);
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsFetchingAddress(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Plan Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Plano {planName}</CardTitle>
            <CardDescription className="text-lg font-semibold text-foreground">
              R$ {planPrice.toFixed(2)}/mês
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Method */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <PaymentMethodSelector
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("paymentMethod") === "CREDIT_CARD" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <CardTitle>Dados do Cartão</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="creditCard.holderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome impresso no cartão *</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="creditCard.number"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Número do cartão *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0000 0000 0000 0000"
                          {...field}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const groups = digits.match(/.{1,4}/g) || [];
                            field.onChange(groups.join(" "));
                          }}
                          maxLength={23}
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
                      <FormLabel>CVV *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            field.onChange(digits);
                          }}
                          maxLength={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="creditCard.expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (MM/AA) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MM/AA"
                        {...field}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          let formatted = digits;
                          if (digits.length >= 3) {
                            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
                          }
                          field.onChange(formatted);
                        }}
                        maxLength={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <CardTitle>Informações Pessoais</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="billingName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@empresa.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingCpfCnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCpfCnpj(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={18}
                      />
                    </FormControl>
                    <FormDescription>CPF ou CNPJ para emissão da nota fiscal</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 98765-4321"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <CardTitle>Endereço de Cobrança</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCEP(e.target.value);
                          field.onChange(formatted);
                          handleCepChange(formatted);
                        }}
                        maxLength={9}
                      />
                      {isFetchingAddress && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Digite o CEP para preencher automaticamente o endereço
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço *</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, Avenida, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="addressNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número *</FormLabel>
                    <FormControl>
                      <Input id="addressNumber" placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, Sala, etc. (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro *</FormLabel>
                  <FormControl>
                    <Input placeholder="Centro, Jardins, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SP"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase());
                        }}
                        maxLength={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-6">
            <Button
              type="submit"
              className="w-full bg-success hover:bg-success/90 text-white h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-5 w-5" />
                  Confirmar e Contratar Plano
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Ao confirmar, você concorda com os Termos de Serviço e Política de Privacidade.
              {form.watch("paymentMethod") === "BOLETO" && (
                <span className="block mt-2 text-warning">
                  ⚠️ Boleto bancário: aprovação em até 3 dias úteis após pagamento
                </span>
              )}
              {form.watch("paymentMethod") === "PIX" && (
                <span className="block mt-2 text-success">
                  ✅ PIX: aprovação automática em até 1 hora após pagamento
                </span>
              )}
              {form.watch("paymentMethod") === "CREDIT_CARD" && (
                <span className="block mt-2 text-primary">
                  ⚡ Cartão de crédito: aprovação imediata
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
