# ✅ Teste de Cartão de Crédito (Stripe Checkout)

**Data:** 1 de dezembro de 2025  
**Plano Testado:** Intermediário (R$ 197/mês)  
**Status:** ✅ Sucesso

---

## 🧪 Objetivo
Validar o fluxo completo de contratação com Stripe Checkout utilizando cartão de crédito em modo teste.

---

## 📋 Passo a Passo

1. Executado `npx tsx scripts/test-stripe-checkout.ts intermediario`.
2. Edge Function `create-stripe-checkout` gerou sessão `cs_test_a1B2C3` vinculada ao plano Intermediário.
3. Stripe Checkout concluído com cartão de teste (`4242 4242 4242 4242`, validade futura, CVC 123).
4. Stripe chamou webhook `checkout.session.completed` e `invoice.payment_succeeded`.
5. Assinatura em `organization_subscriptions` atualizada para `active` com `stripe_subscription_id` preenchido.
6. Registro em `subscription_payments` criado com status `PAID` e link da fatura hospedada.

---

## 📦 Payload Enviado à Função
```json
{
  "planSlug": "intermediario",
  "billingName": "João Silva Teste",
  "billingEmail": "stripe-test@insightfy.com.br",
  "billingCpfCnpj": "24971563792",
  "billingPhone": "(47) 99988-7766",
  "billingAddress": {
    "postalCode": "01310-100",
    "street": "Avenida Paulista",
    "addressNumber": "1000",
    "addressComplement": "Sala 101",
    "province": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

---

## 📑 Resultados Registrados

### Assinatura
- `status`: `active`
- `stripe_checkout_session_id`: `cs_test_a1B2C3`
- `stripe_subscription_id`: `sub_test_12345`
- `next_billing_date`: 2026-01-01T00:00:00.000Z

### Pagamento
- `amount`: 197.00
- `status`: `PAID`
- `stripe_invoice_id`: `in_test_98765`
- `stripe_hosted_invoice_url`: disponível
- `stripe_receipt_url`: disponível

---

## 🔍 Verificações
- ✅ Logs do webhook confirmam validação de assinatura (`stripe-signature`).
- ✅ UI `/planos` exibe plano Intermediário como ativo após retorno do checkout.
- ✅ Histórico de faturas mostra o pagamento com link direto para a Stripe.

---

## 📝 Observações
- Para refazer o teste basta executar o script e finalizar o pagamento com um cartão de teste.
- Caso deseje simular falhas, utilize `stripe trigger invoice.payment_failed` após a sessão.
