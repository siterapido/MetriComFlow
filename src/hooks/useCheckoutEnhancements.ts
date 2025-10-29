import { useEffect, useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { stripNonNumeric } from "@/lib/cpf-cnpj-validator";
import { toast } from "sonner";
import { CheckoutFormData } from "@/components/subscription/CheckoutForm";

const STORAGE_KEY = "checkout_progress";

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  document?: string;
  raw_user_meta_data?: {
    full_name?: string;
    phone?: string;
    document?: string;
  };
}

interface CheckoutEnhancementsOptions {
  form: UseFormReturn<CheckoutFormData>;
  onExistingUserFound?: (userData: UserData) => void;
}

export function useCheckoutEnhancements({ 
  form, 
  onExistingUserFound 
}: CheckoutEnhancementsOptions) {
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [existingUser, setExistingUser] = useState<UserData | null>(null);
  const [showLoginOption, setShowLoginOption] = useState(false);

  // Salvar progresso no localStorage
  const saveProgress = useCallback(() => {
    const formData = form.getValues();
    const progressData = {
      ...formData,
      // Não salvar dados sensíveis
      accountPassword: "",
      confirmPassword: "",
      creditCard: {
        ...formData.creditCard,
        number: "",
        ccv: "",
      },
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.warn("Erro ao salvar progresso:", error);
    }
  }, [form]);

  // Carregar progresso do localStorage
  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const progressData = JSON.parse(saved);
        
        // Verificar se não é muito antigo (24 horas)
        const isRecent = Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent) {
          // Remover campos sensíveis e timestamp antes de aplicar
          const { accountPassword, confirmPassword, timestamp, ...safeData } = progressData;
          
          // Aplicar dados salvos ao formulário
          Object.entries(safeData).forEach(([key, value]) => {
            if (value && key !== "creditCard") {
              form.setValue(key as keyof CheckoutFormData, value);
            }
          });

          // Aplicar dados do cartão (exceto número e CVV)
          if (progressData.creditCard) {
            const { number, ccv, ...safeCreditCard } = progressData.creditCard;
            Object.entries(safeCreditCard).forEach(([key, value]) => {
              if (value) {
                form.setValue(`creditCard.${key}` as any, value);
              }
            });
          }

          toast.success("Progresso anterior restaurado", {
            description: "Seus dados foram preenchidos automaticamente"
          });
        } else {
          // Remover dados antigos
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn("Erro ao carregar progresso:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [form]);

  // Limpar progresso salvo
  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Verificar se usuário já existe por email
  const checkExistingUserByEmail = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) return;

    setIsCheckingUser(true);
    try {
      // Verificar se o email já está cadastrado
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.warn("Erro ao verificar usuários:", error);
        return;
      }

      const existingUser = data.users.find(user => 
        user.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        setExistingUser(existingUser as UserData);
        setShowLoginOption(true);
        onExistingUserFound?.(existingUser as UserData);
        
        toast.info("Email já cadastrado", {
          description: "Você pode fazer login ou continuar com uma nova conta",
          duration: 5000,
        });
      } else {
        setExistingUser(null);
        setShowLoginOption(false);
      }
    } catch (error) {
      console.warn("Erro ao verificar email:", error);
    } finally {
      setIsCheckingUser(false);
    }
  }, [onExistingUserFound]);

  // Auto-preenchimento por CPF/CNPJ
  const autoFillByCpfCnpj = useCallback(async (cpfCnpj: string) => {
    const cleanDocument = stripNonNumeric(cpfCnpj);
    if (cleanDocument.length < 11) return;

    setIsCheckingUser(true);
    try {
      // Buscar usuário por documento no metadata
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.warn("Erro ao buscar usuários:", error);
        return;
      }

      const existingUser = data.users.find(user => {
        const userDoc = user.user_metadata?.document || user.raw_user_meta_data?.document;
        return userDoc && stripNonNumeric(userDoc) === cleanDocument;
      });

      if (existingUser) {
        const userData = existingUser as UserData;
        setExistingUser(userData);
        
        // Auto-preencher campos disponíveis
        if (userData.email) {
          form.setValue("billingEmail", userData.email);
        }
        
        const fullName = userData.raw_user_meta_data?.full_name || userData.full_name;
        if (fullName) {
          form.setValue("billingName", fullName);
        }
        
        const phone = userData.raw_user_meta_data?.phone || userData.phone;
        if (phone) {
          form.setValue("billingPhone", phone);
        }

        toast.success("Dados encontrados!", {
          description: "Informações preenchidas automaticamente",
          duration: 3000,
        });

        onExistingUserFound?.(userData);
      }
    } catch (error) {
      console.warn("Erro ao buscar por CPF/CNPJ:", error);
    } finally {
      setIsCheckingUser(false);
    }
  }, [form, onExistingUserFound]);

  // Login rápido para usuário existente
  const quickLogin = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Erro no login", {
          description: "Verifique suas credenciais e tente novamente"
        });
        return false;
      }

      if (data.user) {
        toast.success("Login realizado com sucesso!");
        setShowLoginOption(false);
        return true;
      }
    } catch (error) {
      console.error("Erro no login rápido:", error);
      toast.error("Erro inesperado no login");
    }
    
    return false;
  }, []);

  // Salvar progresso automaticamente quando campos importantes mudarem
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Salvar progresso quando campos importantes mudarem
      const importantFields = [
        "billingName", "billingEmail", "billingCpfCnpj", "billingPhone",
        "postalCode", "street", "addressNumber", "city", "state"
      ];
      
      if (name && importantFields.includes(name)) {
        // Debounce para evitar muitas gravações
        const timeoutId = setTimeout(saveProgress, 1000);
        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, saveProgress]);

  // Carregar progresso na inicialização
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return {
    isCheckingUser,
    existingUser,
    showLoginOption,
    checkExistingUserByEmail,
    autoFillByCpfCnpj,
    quickLogin,
    saveProgress,
    loadProgress,
    clearProgress,
    setShowLoginOption,
  };
}