/**
 * Utilitários para formatação de números de telefone para WhatsApp
 */

/**
 * Formata número de telefone brasileiro para WhatsApp
 * 
 * Regras:
 * - Remove toda formatação (espaços, parênteses, hífens, pontos)
 * - Adiciona código do país (55) se ausente
 * - Detecta e adiciona DDD padrão se ausente
 * - Detecta e adiciona nono dígito para celulares se ausente
 * 
 * @param phone - Número de telefone em qualquer formato
 * @param defaultDDD - DDD padrão a usar quando não detectado (padrão: '11')
 * @returns Número formatado para WhatsApp ou null se inválido
 * 
 * @example
 * formatWhatsAppNumber('5511987654321') // '5511987654321'
 * formatWhatsAppNumber('11987654321')   // '5511987654321'
 * formatWhatsAppNumber('987654321')     // '5511987654321' (usa DDD padrão)
 * formatWhatsAppNumber('1187654321')    // '5511987654321' (adiciona 9º dígito)
 * formatWhatsAppNumber('(11) 98765-4321') // '5511987654321'
 */
export function formatWhatsAppNumber(
    phone: string | null | undefined,
    defaultDDD = '11'
): string | null {
    // Validar entrada
    if (!phone) return null;

    // Remover toda formatação
    const digits = phone.replace(/\D/g, '');

    // Validar se tem dígitos suficientes
    if (digits.length < 8) return null;

    let result = digits;

    // Analisar quantidade de dígitos
    switch (digits.length) {
        case 13: {
            // 55 + DDD (2) + celular (9) → OK
            if (digits.startsWith('55')) {
                result = digits;
            } else {
                return null;
            }
            break;
        }

        case 12: {
            // Pode ser:
            // 1. 55 + DDD (2) + celular sem 9º dígito (8)
            // 2. 55 + DDD (2) + fixo (8)
            if (digits.startsWith('55')) {
                const afterCountry = digits.substring(2); // DDD + número
                const ddd = afterCountry.substring(0, 2);
                const number = afterCountry.substring(2);
                const firstDigit = number[0];

                // Se o primeiro dígito é 6-9, provavelmente é celular sem 9º dígito
                if (['6', '7', '8', '9'].includes(firstDigit)) {
                    result = `55${ddd}9${number}`;
                } else {
                    // Fixo (começa com 2-5)
                    result = digits;
                }
            } else {
                return null;
            }
            break;
        }

        case 11: {
            // DDD (2) + celular (9) → Adicionar 55
            const ddd = digits.substring(0, 2);
            const number = digits.substring(2);
            const firstDigit = number[0];

            // Validar que começa com 9 (celular)
            if (firstDigit === '9') {
                result = `55${digits}`;
            } else {
                return null;
            }
            break;
        }

        case 10: {
            // Pode ser:
            // 1. DDD (2) + celular sem 9º (8)
            // 2. DDD (2) + fixo (8)
            const ddd = digits.substring(0, 2);
            const number = digits.substring(2);
            const firstDigit = number[0];

            // Se o primeiro dígito é 6-9, provavelmente é celular sem 9º dígito
            if (['6', '7', '8', '9'].includes(firstDigit)) {
                result = `55${ddd}9${number}`;
            } else {
                // Fixo (começa com 2-5)
                result = `55${digits}`;
            }
            break;
        }

        case 9: {
            // Celular (9) sem DDD → Adicionar 55 + DDD padrão
            const firstDigit = digits[0];
            if (firstDigit === '9') {
                result = `55${defaultDDD}${digits}`;
            } else {
                return null;
            }
            break;
        }

        case 8: {
            // Pode ser:
            // 1. Celular sem 9º e sem DDD
            // 2. Fixo sem DDD
            const firstDigit = digits[0];

            // Se o primeiro dígito é 6-9, provavelmente é celular sem 9º dígito
            if (['6', '7', '8', '9'].includes(firstDigit)) {
                result = `55${defaultDDD}9${digits}`;
            } else {
                // Fixo (começa com 2-5)
                result = `55${defaultDDD}${digits}`;
            }
            break;
        }

        default:
            return null;
    }

    // Validar resultado final (deve ter 12-13 dígitos e começar com 55)
    if (result.length < 12 || result.length > 13 || !result.startsWith('55')) {
        return null;
    }

    return result;
}

/**
 * Gera URL do WhatsApp para um número de telefone
 * 
 * @param phone - Número de telefone em qualquer formato
 * @param defaultDDD - DDD padrão a usar quando não detectado
 * @param leadName - Nome do lead para incluir na mensagem (opcional)
 * @returns URL do WhatsApp ou null se número inválido
 */
export function getWhatsAppUrl(
    phone: string | null | undefined,
    defaultDDD = '11',
    leadName?: string
): string | null {
    const formatted = formatWhatsAppNumber(phone, defaultDDD);
    if (!formatted) return null;

    // Se tiver nome do lead, criar mensagem personalizada
    if (leadName) {
        const message = `Olá ${leadName}, tudo bem? 😊`;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formatted}?text=${encodedMessage}`;
    }

    return `https://wa.me/${formatted}`;
}
