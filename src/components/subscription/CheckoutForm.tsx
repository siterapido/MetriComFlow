import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  formatCpfCnpj,
  validateCpfCnpj,
  stripNonNumeric,
  formatPhone,
  validatePhone,
  formatCEP,
  validateCEP,
} from "@/lib/cpf-cnpj-validator";
import { useRealTimeValidation } from "@/hooks/useRealTimeValidation";
import { ValidationIndicator } from "./ValidationIndicator";
import { toast } from "sonner";

const checkoutSchema = z
  .object({
    billingName: z.string().min(3, "Nome completo é obrigatório"),
    billingEmail: z.string().email("Email inválido"),
    billingCpfCnpj: z.string().refine(validateCpfCnpj, {
      message: "CPF/CNPJ inválido",
    }),
    billingPhone: z.string().refine(validatePhone, {
      message: "Telefone inválido (ex: (11) 98765-4321)",
    }),
    postalCode: z.string().optional(),
    street: z.string().optional(),
    addressNumber: z.string().optional(),
    complement: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.postalCode) {
      return;
    }

    if (!validateCEP(data.postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CEP inválido",
        path: ["postalCode"],
      });
    }

    if (!data.street || data.street.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a rua/avenida",
        path: ["street"],
      });
    }

    if (!data.addressNumber || data.addressNumber.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Número do endereço é obrigatório",
        path: ["addressNumber"],
      });
    }

    if (!data.province || data.province.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o bairro",
        path: ["province"],
      });
    }

    if (!data.city || data.city.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a cidade",
        path: ["city"],
      });
    }

    if (!data.state || data.state.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estado deve ter 2 letras",
        path: ["state"],
      });
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  planName: string;
  planPrice: number;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CheckoutForm({
  planName,
  planPrice,
  onSubmit,
  isLoading = false,
}: CheckoutFormProps) {
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
    },
  });

  const billingEmail = form.watch("billingEmail");
  const billingCpfCnpj = form.watch("billingCpfCnpj");
  const billingPhone = form.watch("billingPhone");
  const postalCodeValue = form.watch("postalCode");

  const {
    emailValidation,
    cpfCnpjValidation,
    phoneValidation,
    cepValidation,
    validateEmail,
    validateCpfCnpj,
    validatePhone,
    validateCep,
  } = useRealTimeValidation();

  useEffect(() => {
    validateEmail(billingEmail);
  }, [billingEmail, validateEmail]);

  useEffect(() => {
    validateCpfCnpj(billingCpfCnpj);
  }, [billingCpfCnpj, validateCpfCnpj]);

  useEffect(() => {
    validatePhone(billingPhone);
  }, [billingPhone, validatePhone]);

  useEffect(() => {
    if (postalCodeValue) {
      validateCep(postalCodeValue);
    }
  }, [postalCodeValue, validateCep]);

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

          setTimeout(() => {
            document.getElementById("addressNumber")?.focus();
          }, 100);
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        toast.error("Não foi possível buscar o endereço pelo CEP.");
      } finally {
        setIsFetchingAddress(false);
      }
    }
  };

  const handleSubmit = async (data: CheckoutFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="bg-gradient-to-br from-card to-accent/20 border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Plano Selecionado</p>
              <h2 className="text-3xl font-bold text-foreground">{planName}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground mb-1">Valor Mensal</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                R$ {planPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-sm text-blue-900">
            Pagamento 100% seguro: após confirmar seus dados, você será redirecionado para o checkout oficial da Stripe
            para concluir a assinatura.
          </AlertDescription>
        </Alert>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Informações de Contato</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
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
                  <ValidationIndicator
                    status={emailValidation.status}
                    message={emailValidation.message}
                  />
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
                    <ValidationIndicator
                      status={cpfCnpjValidation.status}
                      message={cpfCnpjValidation.message}
                    />
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
                    <ValidationIndicator
                      status={phoneValidation.status}
                      message={phoneValidation.message}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Endereço de Cobrança</h3>
              </div>
              <span className="text-xs text-muted-foreground">Usado para notas fiscais e recibos</span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
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
                  <ValidationIndicator
                    status={cepValidation.status}
                    message={cepValidation.message}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
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
                    <FormLabel>Número</FormLabel>
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
                  <FormLabel>Bairro</FormLabel>
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
                      <FormLabel>Cidade</FormLabel>
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
                    <FormLabel>Estado</FormLabel>
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
          </div>
        </div>

        <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl p-6">
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
                Ir para pagamento seguro
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
