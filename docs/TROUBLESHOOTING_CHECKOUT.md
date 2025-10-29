# 🔧 Troubleshooting – Checkout com Stripe

Este guia ajuda a diagnosticar problemas no fluxo de contratação baseado no Stripe Checkout.

---

## 🧭 Primeiro Passo: Reproduzir com Console Aberto
1. Abra o checkout (público ou via modal de planos).
2. Preencha os dados obrigatórios e envie o formulário.
3. Deixe o console do navegador aberto para capturar o payload enviado à função `create-stripe-checkout` e a resposta HTTP.

Exemplo de log esperado:
```json
📤 Payload enviado: {
  "planSlug": "basico",
  "billingName": "João Silva",
  "billingEmail": "joao@example.com",
  "billingCpfCnpj": "123.456.789-09",
  "billingPhone": "(47) 99988-7766",
  "billingAddress": {
    "postalCode": "01310-100",
    "street": "Avenida Paulista",
    "addressNumber": "1000",
    "province": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }
}

📦 Resposta HTTP: 200 OK
📎 Corpo: { "success": true, "checkoutUrl": "https://checkout.stripe.com/..." }
```

Se a resposta vier com `success: false`, use a mensagem para identificar o problema inicial.

---

## ❌ Erros Comuns da Edge Function

### "Plano não informado" / "Plano não encontrado"
- Verifique se o `planSlug` existe na tabela `subscription_plans` e se possui `stripe_price_id` configurado.

### "Nome e email são obrigatórios"
- Certifique-se de que o formulário está enviando `billingName` e `billingEmail` preenchidos.

### "Plano sem Stripe Price configurado"
- Preencha as colunas `stripe_price_id` (e opcionalmente `stripe_product_id`) no Supabase.
- Sincronize os preços com os IDs da Stripe criados no dashboard.

### "Falha ao criar organização" / "Falha ao criar assinatura"
- Verifique permissões RLS e se a função está rodando com service role (`SERVICE_ROLE_KEY`).
- Confirme que o banco está aceitando `insert` em `organizations` e `organization_subscriptions`.

### "Stripe secret key is not configured"
- Certifique-se que `STRIPE_SECRET_KEY` está definido em `supabase secrets` e no `.env` local.

### HTTP 500 genérico
1. Consulte os logs da função:
   ```bash
   npx supabase functions logs create-stripe-checkout --tail
   ```
2. Busque mensagens como `Stripe API error` ou `Failed to update subscription`.
3. Verifique se há payloads inválidos ou falha de autenticação com a Stripe.

---

## ⚠️ Problemas Durante o Redirecionamento
- **Usuário permanece na mesma página:** confira se o frontend está usando a `checkoutUrl` retornada e chamando `window.location.assign`.
- **URL de sucesso/cancelamento incorreta:** a função utiliza `APP_URL` para montar as URLs. Ajuste a env se estiver redirecionando para domínio errado.

---

## 🧾 Erros Após o Pagamento (Webhook)
Quando o pagamento conclui, o webhook `stripe-webhook` atualiza assinatura e histórico. Se isso não acontecer:

1. Valide a assinatura do webhook executando localmente com o Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
   ```
2. Confira os logs:
   ```bash
   npx supabase functions logs stripe-webhook --tail
   ```
3. Mensagens comuns:
   - `Invalid Stripe signature`: confirme `STRIPE_WEBHOOK_SECRET` nas variáveis.
   - `Subscription not found for Stripe invoice`: cheque se `organization_subscriptions.stripe_subscription_id` foi preenchido na criação da sessão.
   - `Failed to update subscription after payment`: revise permissões RLS e colunas obrigatórias.

---

## ✅ Checklist Antes de Abrir Bug
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `APP_URL` configurados.
- [ ] `subscription_plans` com `stripe_price_id` e `stripe_product_id` válidos.
- [ ] Edge Functions `create-stripe-checkout` e `stripe-webhook` deployadas.
- [ ] Webhook registrado no painel da Stripe apontando para `/functions/v1/stripe-webhook`.
- [ ] Logs revisados (Edge Functions + Stripe Dashboard → Developers → Events).
- [ ] Payloads de requisição validados (CPF/CNPJ, telefone e endereço com formato correto).

---

## 🧪 Script de Diagnóstico
Execute o teste automatizado para gerar uma sessão de checkout de teste:
```bash
npx tsx scripts/test-stripe-checkout.ts
```
O script utiliza credenciais do `.env`, cria uma assinatura de teste para o plano informado e imprime a URL de checkout, permitindo validar rapidamente se a função e as credenciais Stripe estão funcionando.
