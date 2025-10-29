import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, MapPin, UserCheck, AlertCircle } from "lucide-react";
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
import { ValidationIndicator, PasswordStrengthIndicator } from "./ValidationIndicator";
import { useRealTimeValidation } from "@/hooks/useRealTimeValidation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const accountCreationSchema = z
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
  });

export type AccountCreationData = z.infer<typeof accountCreationSchema>;

interface AccountCreationStepProps {
  onNext: (data: AccountCreationData, userCreated?: boolean) => void;
  initialData?: Partial<AccountCreationData>;
  isLoading?: boolean;
}

export function AccountCreationStep({
  onNext,
  initialData,
  isLoading = false,
}: AccountCreationStepProps) {
  const [addressLoading, setAddressLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  
  const form = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: {
      billingName: initialData?.billingName || "",
      billingEmail: initialData?.billingEmail || "",
      billingCpfCnpj: initialData?.billingCpfCnpj || "",
      billingPhone: initialData?.billingPhone || "",
      postalCode: initialData?.postalCode || "",
      street: initialData?.street || "",
      addressNumber: initialData?.addressNumber || "",
      complement: initialData?.complement || "",
      province: initialData?.province || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      accountPassword: initialData?.accountPassword || "",
      confirmPassword: initialData?.confirmPassword || "",
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

  const handleCepBlur = async (cep: string) => {
    const cleanCep = stripNonNumeric(cep);
    if (cleanCep.length !== 8) return;

    setAddressLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("street", data.logradouro || "");
        form.setValue("province", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setAddressLoading(false);
    }
  };

  const onSubmit = async (data: AccountCreationData) => {
    setCreatingAccount(true);
    
    try {
      const email = data.billingEmail.trim().toLowerCase();
      const password = data.accountPassword;
      const sanitizedPhone = stripNonNumeric(data.billingPhone);
      const sanitizedCpfCnpj = stripNonNumeric(data.billingCpfCnpj);

      // Tentar criar a conta no Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: data.billingName,
            phone: sanitizedPhone,
            document: sanitizedCpfCnpj,
          },
        },
      });

      if (signUpError) {
        const msg = String(signUpError.message || signUpError).toLowerCase();
        const isAlreadyRegistered =
          msg.includes("already") || msg.includes("registrado") || msg.includes("existing");

        if (isAlreadyRegistered) {
          // Tentar fazer login se a conta já existe
          const { error: loginError } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
          });
          
          if (loginError) {
            toast.error("Email já cadastrado com senha diferente. Tente fazer login ou use outro email.");
            setCreatingAccount(false);
            return;
          }
          
          toast.success("Login realizado com sucesso! Conta já existia.");
          onNext(data, true);
        } else {
          throw signUpError;
        }
      } else {
        // Conta criada com sucesso
        toast.success("Conta criada com sucesso! Agora você pode prosseguir com o pagamento.");
        onNext(data, true);
      }
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      toast.error(error.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Criar Conta</h2>
        <p className="text-muted-foreground">
          Preencha seus dados pessoais para criar sua conta
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Dados Pessoais
            </div>

            <FormField
              control={form.control}
              name="billingName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Seu nome completo"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                      <ValidationIndicator
                        state={{ status: "idle" }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          validateEmail(e.target.value);
                        }}
                      />
                      <ValidationIndicator
                        state={emailValidation}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
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
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          value={formatCpfCnpj(field.value)}
                          onChange={(e) => {
                            const value = formatCpfCnpj(e.target.value);
                            field.onChange(value);
                            validateCpfCnpj(value);
                          }}
                        />
                        <ValidationIndicator
                          state={cpfCnpjValidation}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="(11) 98765-4321"
                          {...field}
                          value={formatPhone(field.value)}
                          onChange={(e) => {
                            const value = formatPhone(e.target.value);
                            field.onChange(value);
                            validatePhone(value);
                          }}
                        />
                        <ValidationIndicator
                          state={phoneValidation}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Endereço
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        value={formatCEP(field.value || "")}
                        onChange={(e) => {
                          const value = stripNonNumeric(e.target.value);
                          field.onChange(value);
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          handleCepBlur(e.target.value);
                        }}
                        disabled={addressLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome da rua"
                        {...field}
                        disabled={addressLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="addressNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
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
                      <Input placeholder="Apto 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bairro"
                        {...field}
                        disabled={addressLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cidade"
                        {...field}
                        disabled={addressLoading}
                      />
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
                <FormItem className="md:w-32">
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SP"
                      {...field}
                      value={field.value?.toUpperCase() || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      maxLength={2}
                      disabled={addressLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Senha */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4" />
              Senha da Conta
            </div>

            <FormField
              control={form.control}
              name="accountPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Sua senha"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                      <PasswordStrengthIndicator password={field.value} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Mínimo 8 caracteres, incluindo letras e números
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
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="password"
                        placeholder="Confirme sua senha"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                      <ValidationIndicator
                        state={{ status: "idle" }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sua conta será criada agora e você poderá acessar o sistema mesmo antes de contratar um plano.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || creatingAccount}
          >
            {creatingAccount ? "Criando conta..." : isLoading ? "Processando..." : "Criar Conta e Continuar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}