# Feature: Contratação de Planos para Contas Sem Plano Ativo (Stripe)

## 📋 Resumo

Fluxo completo para organizações sem assinatura ativa contratarem um plano via Stripe Checkout diretamente pela aba "Planos".

## ✅ Status: Implementado

**Data:** 1 de dezembro de 2025  
**Branch:** main

---

## 🎯 Objetivos Alcançados

1. Identificação do estado "sem plano" ou "assinatura cancelada/expirada" com CTAs dedicados.
2. Formulário unificado (`CheckoutForm`) coletando dados fiscais obrigatórios.
3. Criação automática de organização/assinatura e redirecionamento ao Stripe (`create-stripe-checkout`).
4. Ativação automática após webhook (`stripe-webhook`).
5. Histórico de invoices centralizado com links da Stripe.

---

## 🔧 Arquivos-Chave

### `src/components/subscription/PlanCard.tsx`
- Exibe botão "Contratar plano" para contas sem assinatura.

### `src/components/subscription/UpgradePlanDialog.tsx`
- Orquestra o fluxo em duas etapas (dados → Stripe Checkout).
- Chama `create-stripe-checkout` e redireciona para `checkoutUrl` retornada.

### `src/hooks/useSubscription.ts`
- Mutation `useUpgradePlan` detecta ausência de assinatura e cria o registro antes do checkout.
- Atualiza o estado após retorno do webhook.

### `supabase/functions/create-stripe-checkout`
- Cria clientes/assinaturas na Stripe e preenche metadados (claim token, plan slug, etc.).

### `supabase/functions/stripe-webhook`
- Marca assinatura como `active`, cria registros em `subscription_payments` e trata cancelamentos.

---

## 📋 Fluxo Completo

1. Usuário acessa `/planos` sem assinatura ativa.
2. Seleciona um plano → abre `UpgradePlanDialog`.
3. `CheckoutForm` valida dados pessoais, CPF/CNPJ, telefone e endereço.
4. Ao confirmar, o frontend chama `create-stripe-checkout`:
   - Cria organização (se pública) e assinatura com status `trial`.
   - Gera/associa `stripe_customer_id`.
   - Cria sessão de checkout e retorna `checkoutUrl`.
5. Frontend redireciona o usuário para o Stripe Checkout.
6. Após pagamento, `stripe-webhook`:
   - Atualiza assinatura para `active` e registra IDs da Stripe.
   - Insere pagamento em `subscription_payments`.
   - Atualiza próximos ciclos (`next_billing_date`).
7. Usuário retorna à aplicação com `session_id` → UI confirma sucesso e exibe plano ativo.

---

## 🔒 Segurança & Regras
- Apenas owners podem iniciar a contratação (RLS + checagens no frontend).
- Dados sensíveis (cartão) nunca passam pelo backend.
- Tokens de claim gerados para fluxos públicos e validados em `claim-account`.

---

## 🧪 Testes Recomendados
- Executar `npx tsx scripts/test-stripe-checkout.ts` para validar criação de sessão.
- Utilizar Stripe CLI (`stripe listen`) para simular `checkout.session.completed` e `invoice.payment_succeeded`.
- Testar retorno manual acessando `?status=success&session_id=...` na aplicação para validar mensagens.

---

## 📈 Cenários Cobertos

| Status Atual | Comportamento |
|--------------|---------------|
| Sem subscription | Mostra CTA "Contratar plano" e abre Stripe após formulário |
| canceled / expired | Permite nova contratação e gera nova sessão Stripe |
| trial | Permite upgrade ou confirmação de assinatura paga |
| past_due | Exibe alerta e permite regularização via novo checkout |
| active | Fluxo de upgrade/downgrade permanece funcionando |

---

## 🚀 Próximos Passos
- Automatizar sincronização de limites/benefícios a partir de metadados do price na Stripe.
- Melhorar feedback pós-retorno do Stripe exibindo resumo do pagamento aprovado.
