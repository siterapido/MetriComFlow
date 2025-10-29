import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, User, FileText, CreditCard, UserCheck, AlertCircle } from "lucide-react";
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
import { PaymentMethodSelector } from "@/components/subscription/PaymentMethodSelector";
import { useCheckoutEnhancements } from "@/hooks/useCheckoutEnhancements";
import { QuickLoginDialog } from "./QuickLoginDialog";
import { ValidationIndicator, PasswordStrengthIndicator } from "./ValidationIndicator";
import { useRealTimeValidation } from "@/hooks/useRealTimeValidation";
import { toast } from "sonner";

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
    .refine((val) => /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(val), {
      message: "Validade inválida (MM/AA ou MM/AAAA)",
    }),
  ccv: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 3 && val.length <= 4, {
      message: "CVV inválido",
    }),
});

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
    paymentMethod: z.enum(["CREDIT_CARD"]),
    creditCard: z.object({
      holderName: z.string().optional(),
      number: z.string().optional(),
      expiry: z.string().optional(),
      ccv: z.string().optional(),
    }).optional(),
    accountPassword: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Za-z]/, "Use letras na senha")
      .regex(/[0-9]/, "Inclua ao menos um número"),
    confirmPassword: z.string().min(8, "Confirme sua senha"),
  })
  .refine((data) => data.accountPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    // Validate credit card fields only when CREDIT_CARD is selected
    if (data.paymentMethod === "CREDIT_CARD") {
      if (!data.creditCard) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dados do cartão são obrigatórios",
          path: ["creditCard"],
        });
        return;
      }

      const creditResult = creditCardSchema.safeParse(data.creditCard);
      if (!creditResult.success) {
        for (const issue of creditResult.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ["creditCard", ...issue.path],
          });
        }
      }

      // Validate address fields only for credit card (required for fraud prevention)
      if (!data.postalCode || !validateCEP(data.postalCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CEP é obrigatório para cartão de crédito",
          path: ["postalCode"],
        });
      }
      if (!data.street || data.street.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Endereço é obrigatório para cartão de crédito",
          path: ["street"],
        });
      }
      if (!data.addressNumber || data.addressNumber.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número é obrigatório para cartão de crédito",
          path: ["addressNumber"],
        });
      }
      if (!data.province || data.province.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bairro é obrigatório para cartão de crédito",
          path: ["province"],
        });
      }
      if (!data.city || data.city.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cidade é obrigatória para cartão de crédito",
          path: ["city"],
        });
      }
      if (!data.state || data.state.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estado é obrigatório para cartão de crédito (2 letras)",
          path: ["state"],
        });
      }
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  planName: string;
  planPrice: number;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading?: boolean;
  onPaymentMethodChange?: (method: CheckoutFormData["paymentMethod"]) => void;
}

export function CheckoutForm({
  planName,
  planPrice,
  onSubmit,
  isLoading = false,
  onPaymentMethodChange,
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
      paymentMethod: "CREDIT_CARD",
      creditCard: {
        holderName: "",
        number: "",
        expiry: "",
        ccv: "",
      },
      accountPassword: "",
      confirmPassword: "",
    },
  });
  
  const paymentMethod = form.watch("paymentMethod");
  const billingEmail = form.watch("billingEmail");
  const billingCpfCnpj = form.watch("billingCpfCnpj");

  // Integração com as melhorias do checkout
  const {
    isCheckingUser,
    existingUser,
    showLoginOption,
    checkExistingUserByEmail,
    autoFillByCpfCnpj,
    quickLogin,
    clearProgress,
    setShowLoginOption,
  } = useCheckoutEnhancements({
    form,
    onExistingUserFound: (userData) => {
      console.log("Usuário existente encontrado:", userData);
    },
  });

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
    onPaymentMethodChange?.(paymentMethod);
  }, [paymentMethod, onPaymentMethodChange]);

  // Verificar email existente com debounce
  useEffect(() => {
    if (billingEmail && billingEmail.includes("@")) {
      const timeoutId = setTimeout(() => {
        checkExistingUserByEmail(billingEmail);
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timeoutId);
    }
  }, [billingEmail, checkExistingUserByEmail]);

  // Auto-preenchimento por CPF/CNPJ com debounce
  useEffect(() => {
    if (billingCpfCnpj && validateCpfCnpj(billingCpfCnpj)) {
      const timeoutId = setTimeout(() => {
        autoFillByCpfCnpj(billingCpfCnpj);
      }, 800); // Debounce de 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [billingCpfCnpj, autoFillByCpfCnpj]);

  // Validações em tempo real
  useEffect(() => {
    validateEmail(billingEmail);
  }, [billingEmail, validateEmail]);

  useEffect(() => {
    validateCpfCnpj(billingCpfCnpj);
  }, [billingCpfCnpj, validateCpfCnpj]);

  useEffect(() => {
    validatePhone(form.watch("billingPhone"));
  }, [form.watch("billingPhone"), validatePhone]);

  useEffect(() => {
    if (form.watch("postalCode")) {
      validateCep(form.watch("postalCode"));
    }
  }, [form.watch("postalCode"), validateCep]);



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

  // Handler melhorado para o submit
  const handleEnhancedSubmit = async (data: CheckoutFormData) => {
    try {
      await onSubmit(data);
      // Limpar progresso salvo após sucesso
      clearProgress();
      toast.success("Cadastro realizado com sucesso!");
    } catch (error) {
      console.error("Erro no checkout:", error);
      toast.error("Erro ao processar checkout. Tente novamente.");
    }
  };

  // Handler para continuar como novo usuário
  const handleContinueAsNew = () => {
    setShowLoginOption(false);
    toast.info("Continuando como novo usuário", {
      description: "Você pode prosseguir com o cadastro normalmente"
    });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleEnhancedSubmit)} className="space-y-8">
        {/* Plan Summary - Minimalista */}
        <div className="bg-gradient-to-br from-card to-accent/20 border border-border rounded-xl p-6 hover-lift">
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

        {/* Alertas informativos */}
        {isCheckingUser && (
          <Alert className="border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Verificando se você já possui uma conta...
            </AlertDescription>
          </Alert>
        )}

        {existingUser && !showLoginOption && (
          <Alert className="border-green-200 bg-green-50">
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>Dados encontrados!</strong> Preenchemos automaticamente suas informações com base no CPF/CNPJ.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment method */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <PaymentMethodSelector value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Credit Card Section */}
        {paymentMethod === "CREDIT_CARD" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Dados do Cartão</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
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
                      <ValidationIndicator 
                        status={creditCardValidation.status} 
                        message={creditCardValidation.message} 
                      />
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
                      <ValidationIndicator 
                        status={cvvValidation.status} 
                        message={cvvValidation.message} 
                      />
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
                            // Permite até 6 dígitos (MM + AAAA)
                            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 6)}`;
                          }
                          field.onChange(formatted);
                          // Removendo validação em tempo real - só valida no submit
                        }}
                        maxLength={7}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}



        {/* Personal Information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Informações Pessoais</h3>
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
                    <ValidationIndicator 
                      status={phoneValidation.status} 
                      message={phoneValidation.message} 
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crie uma senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                    </FormControl>
                    <PasswordStrengthIndicator password={field.value || ""} />
                    <FormDescription>
                      A senha será usada para acessar o painel após a confirmação.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repita a senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Billing Address - Only show for Credit Card */}
        {paymentMethod === "CREDIT_CARD" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Endereço de Cobrança</h3>
                </div>
                <span className="text-xs text-warning bg-warning/10 px-3 py-1 rounded-full">
                  Obrigatório para Cartão
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
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
                  <ValidationIndicator 
                    status={cepValidation.status} 
                    message={cepValidation.message} 
                  />
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
          </div>
          </div>
        )}

        {/* Submit Button */}
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
                <FileText className="mr-2 h-5 w-5" />
                Confirmar e Contratar Plano
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Ao confirmar, você concorda com os Termos de Serviço e Política de Privacidade.
            <span className="block mt-2 text-primary font-medium">
              ⚡ Cartão de crédito: aprovação imediata
            </span>
          </p>
        </div>
      </form>
    </Form>

    {/* Dialog de Login Rápido */}
    <QuickLoginDialog
      open={showLoginOption}
      onOpenChange={setShowLoginOption}
      email={billingEmail}
      onLogin={quickLogin}
      onContinueAsNew={handleContinueAsNew}
    />
  </>
  );
}
