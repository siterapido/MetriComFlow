# Checkout Stripe em Produção ✅

## Status: **PRONTO PARA USO**

Data: 1 de dezembro de 2025

---

## 📋 Resumo

O checkout público agora utiliza o Stripe como gateway padrão. Todo o fluxo – da criação da organização à confirmação da assinatura – foi revisado para usar `create-stripe-checkout` e `stripe-webhook`.

---

## 🔗 URLs Importantes

### Checkout Público
Base: `https://www.insightfy.com.br/checkout`

Exemplos por plano:
- Básico: `https://www.insightfy.com.br/checkout?plan=basico`
- Intermediário: `https://www.insightfy.com.br/checkout?plan=intermediario`
- Pro: `https://www.insightfy.com.br/checkout?plan=pro`

### Webhook Stripe
Configure em **Developers → Webhooks** na Stripe: `https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/stripe-webhook`

---

## ✅ Checklist de Produção

### Infraestrutura
- [x] Edge Functions deployadas em produção
  - `create-stripe-checkout`
  - `stripe-webhook`
  - `claim-account`
- [x] Tabelas Supabase com colunas Stripe (`stripe_customer_id`, `stripe_subscription_id`, etc.)
- [x] RLS revisado para permitir updates via service role

### Configuração Stripe
- [x] `STRIPE_SECRET_KEY` (modo live) configurada em Supabase Secrets
- [x] `STRIPE_WEBHOOK_SECRET` copiado da Stripe e configurado
- [x] Webhook registrado apontando para `stripe-webhook`
- [x] Planos criados na Stripe (Products + Prices) correspondendo aos slugs do banco

### Frontend
- [x] `CheckoutForm` coleta dados fiscais e prepara payload
- [x] Redirecionamento automático para `checkoutUrl` da Stripe
- [x] Página `/checkout` pública com onboarding após retorno (`finalizar-cadastro`)

---

## 🎯 Fluxo de Checkout

1. Cliente acessa `/checkout?plan=slug` ou o modal em `/planos`.
2. Preenche dados pessoais e fiscais.
3. Frontend chama `create-stripe-checkout`.
4. Função cria organização/assinatura, prepara sessão Stripe e retorna `checkoutUrl`.
5. Cliente é redirecionado para o Stripe Checkout (cartão/PIX disponíveis conforme configuração da Stripe).
6. Stripe confirma pagamento → webhook atualiza assinatura, gera registros em `subscription_payments` e envia email com recibo.
7. Cliente retorna via URL de sucesso e conclui cadastro (fluxo público) ou vê confirmação (fluxo autenticado).

---

## 💳 Métodos de Pagamento

A Stripe define automaticamente os métodos habilitados para o país/conta. No modo teste estão ativos:
- Cartão de crédito (autorização imediata)
- PIX (Checkout apresenta QR Code gerenciado pela Stripe)

Para habilitar boletos ou outros meios, configure diretamente no dashboard Stripe.

---

## 🔐 Segurança
- Chaves armazenadas como secrets no Supabase e no Vercel.
- Dados de cartão nunca tocam nossos servidores; toda a captura ocorre no domínio Stripe.
- Webhook validado com HMAC (`stripe-signature`).
- Tokens de claim permanecem com expiração e são usados apenas no fluxo público.

---

## 🧪 Testes Recomendados Antes de Lançar
1. Executar `npx tsx scripts/test-stripe-checkout.ts` e confirmar URL de checkout.
2. Criar assinatura de teste via checkout público e garantir que webhook marcou status como `active`.
3. Usar Stripe CLI para simular eventos críticos:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.payment_succeeded
   stripe trigger invoice.payment_failed
   ```
4. Validar que `/planos` exibe plano ativo e histórico de faturas com links da Stripe.

---

## 📈 Planos Disponíveis

| Plano | Preço | Slug | Stripe Price |
|-------|-------|------|--------------|
| Básico | R$ 97/mês | `basico` | `price_xxx_basico` |
| Intermediário | R$ 197/mês | `intermediario` | `price_xxx_inter` |
| Pro | R$ 497/mês | `pro` | `price_xxx_pro` |

Atualize os IDs conforme configurados no dashboard.

---

## 🧭 Operação Contínua
- Monitorar eventos em Stripe → Developers → Events.
- Revisar periodicamente `subscription_payments` para garantir sincronização.
- Atualizar prices/planos na Stripe antes de alterar valores no banco.
