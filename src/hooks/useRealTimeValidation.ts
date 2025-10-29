import { useState, useCallback } from "react";
import { validateCpfCnpj } from "@/lib/cpf-cnpj-validator";

export type ValidationStatus = "idle" | "validating" | "valid" | "invalid" | "warning";

interface ValidationState {
  status: ValidationStatus;
  message?: string;
}

export function useRealTimeValidation() {
  const [emailValidation, setEmailValidation] = useState<ValidationState>({ status: "idle" });
  const [cpfCnpjValidation, setCpfCnpjValidation] = useState<ValidationState>({ status: "idle" });
  const [phoneValidation, setPhoneValidation] = useState<ValidationState>({ status: "idle" });
  const [cepValidation, setCepValidation] = useState<ValidationState>({ status: "idle" });


  const validateEmail = (email: string) => {
    if (!email) {
      setEmailValidation({ status: "idle" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      setEmailValidation({ 
        status: "invalid", 
        message: "Formato de email inválido" 
      });
    } else {
      setEmailValidation({ 
        status: "valid", 
        message: "Email válido" 
      });
    }
  };

  const validateCpfCnpjField = useCallback((value: string) => {
    if (!value) {
      setCpfCnpjValidation({ status: "idle", message: "" });
      return;
    }

    setCpfCnpjValidation({ status: "validating", message: "Validando..." });

    const cleanValue = value.replace(/\D/g, "");
    
    if (cleanValue.length < 11) {
      setCpfCnpjValidation({ 
        status: "invalid", 
        message: "CPF/CNPJ incompleto" 
      });
      return;
    }

    if (validateCpfCnpj(value)) {
      const isCompany = cleanValue.length === 14;
      setCpfCnpjValidation({ 
        status: "valid", 
        message: isCompany ? "CNPJ válido" : "CPF válido"
      });
    } else {
      const isCompany = cleanValue.length === 14;
      setCpfCnpjValidation({ 
        status: "invalid", 
        message: isCompany ? "CNPJ inválido" : "CPF inválido"
      });
    }
  }, []);

  const validatePhone = (phone: string) => {
    if (!phone) {
      setPhoneValidation({ status: "idle" });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.length < 10) {
      setPhoneValidation({ 
        status: "warning", 
        message: "Digite pelo menos 10 dígitos" 
      });
    } else if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      setPhoneValidation({ 
        status: "valid", 
        message: "Telefone válido" 
      });
    } else {
      setPhoneValidation({ 
        status: "invalid", 
        message: "Formato de telefone inválido" 
      });
    }
  };

  const validateCep = async (cep: string) => {
    if (!cep) {
      setCepValidation({ status: "idle" });
      return;
    }

    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      setCepValidation({ 
        status: "warning", 
        message: "CEP deve ter 8 dígitos" 
      });
      return;
    }

    setCepValidation({ 
      status: "validating", 
      message: "Verificando CEP..." 
    });

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepValidation({ 
          status: "invalid", 
          message: "CEP não encontrado" 
        });
      } else {
        setCepValidation({ 
          status: "valid", 
          message: `${data.localidade} - ${data.uf}` 
        });
      }
    } catch (error) {
      setCepValidation({ 
        status: "invalid", 
        message: "Erro ao verificar CEP" 
      });
    }
  };



  return {
    emailValidation,
    cpfCnpjValidation,
    phoneValidation,
    cepValidation,
    validateEmail,
    validateCpfCnpj: validateCpfCnpjField,
    validatePhone,
    validateCep,
  };
}