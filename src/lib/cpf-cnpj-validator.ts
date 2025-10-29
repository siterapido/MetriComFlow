/**
 * CPF/CNPJ Validation and Formatting Utilities
 */

/**
 * Remove all non-numeric characters
 */
export function stripNonNumeric(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value.replace(/\D/g, '');
}

/**
 * Format CPF: 000.000.000-00
 */
export function formatCPF(value: string | undefined | null): string {
  if (!value) return '';
  const numbers = stripNonNumeric(value);

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;

  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Format CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(value: string | undefined | null): string {
  if (!value) return '';
  const numbers = stripNonNumeric(value);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;

  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

/**
 * Auto-format CPF or CNPJ based on length
 */
export function formatCpfCnpj(value: string | undefined | null): string {
  if (!value) return '';
  const numbers = stripNonNumeric(value);

  if (numbers.length <= 11) {
    return formatCPF(value);
  }

  return formatCNPJ(value);
}

/**
 * Validate CPF
 */
export function validateCPF(cpf: string | undefined | null): boolean {
  if (!cpf) return false;
  const numbers = stripNonNumeric(cpf);

  if (numbers.length !== 11) return false;

  // Check for known invalid CPFs (all same digit)
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers[9])) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers[10])) return false;

  return true;
}

/**
 * Validate CNPJ
 */
export function validateCNPJ(cnpj: string | undefined | null): boolean {
  if (!cnpj) return false;
  const numbers = stripNonNumeric(cnpj);

  if (numbers.length !== 14) return false;

  // Check for known invalid CNPJs (all same digit)
  if (/^(\d)\1{13}$/.test(numbers)) return false;

  // Validate first check digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers[12])) return false;

  // Validate second check digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers[13])) return false;

  return true;
}

/**
 * Validate CPF or CNPJ based on length
 */
export function validateCpfCnpj(value: string | undefined | null): boolean {
  if (!value) return false;
  const numbers = stripNonNumeric(value);

  if (numbers.length === 11) {
    return validateCPF(value);
  }

  if (numbers.length === 14) {
    return validateCNPJ(value);
  }

  return false;
}

/**
 * Check if value is CPF (11 digits) or CNPJ (14 digits)
 */
export function isCPF(value: string | undefined | null): boolean {
  if (!value) return false;
  const numbers = stripNonNumeric(value);
  return numbers.length === 11;
}

export function isCNPJ(value: string | undefined | null): boolean {
  if (!value) return false;
  const numbers = stripNonNumeric(value);
  return numbers.length === 14;
}

/**
 * Format phone number: (00) 00000-0000 or (00) 0000-0000
 */
export function formatPhone(value: string | undefined | null): string {
  if (!value) return '';
  const numbers = stripNonNumeric(value);

  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;

  // Mobile with 9 digits
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Format CEP: 00000-000
 */
export function formatCEP(value: string | undefined | null): string {
  if (!value) return '';
  const numbers = stripNonNumeric(value);

  if (numbers.length <= 5) return numbers;

  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

/**
 * Validate phone (10 or 11 digits)
 */
export function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const numbers = stripNonNumeric(phone);
  return numbers.length === 10 || numbers.length === 11;
}

/**
 * Validate CEP (8 digits)
 */
export function validateCEP(cep: string | undefined | null): boolean {
  if (!cep) return false;
  const numbers = stripNonNumeric(cep);
  return numbers.length === 8;
}
