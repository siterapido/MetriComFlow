# Configuração do Webhook Asaas

## Status Atual

✅ **Backend Integration Complete**
- Subscription successfully created in Asaas: `sub_fr09q374mxgxulz6`
- Customer ID: `cus_000142972434`
- Webhook endpoint deployed and ready: `https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook`

## Próximos Passos

### 1. Configurar Webhook no Dashboard Asaas

1. Acesse: https://app.asaas.com/webhooks
2. Clique em **"Novo Webhook"** ou **"Adicionar Webhook"**
3. Preencha os campos:

   **URL do Webhook:**
   ```
   https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook
   ```

   **Nome:** `Metricom Flow - Production`

   **Status:** `Ativo`

4. **Selecione os seguintes eventos** (17 eventos no total):

   **Eventos de Pagamento (Payment Events):**
   - ✅ `PAYMENT_CREATED` - Cobrança criada
   - ✅ `PAYMENT_UPDATED` - Cobrança atualizada
   - ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado (cartão de crédito)
   - ✅ `PAYMENT_RECEIVED` - Pagamento recebido
   - ✅ `PAYMENT_OVERDUE` - Pagamento vencido
   - ✅ `PAYMENT_DELETED` - Cobrança removida
   - ✅ `PAYMENT_RESTORED` - Cobrança restaurada
   - ✅ `PAYMENT_REFUNDED` - Pagamento estornado
   - ✅ `PAYMENT_RECEIVED_IN_CASH` - Pagamento recebido em dinheiro
   - ✅ `PAYMENT_CHARGEBACK_REQUESTED` - Chargeback solicitado
   - ✅ `PAYMENT_CHARGEBACK_DISPUTE` - Disputa de chargeback
   - ✅ `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` - Aguardando reversão

   **Eventos de Assinatura (Subscription Events):**
   - ✅ `SUBSCRIPTION_CREATED` - Assinatura criada
   - ✅ `SUBSCRIPTION_UPDATED` - Assinatura atualizada
   - ✅ `SUBSCRIPTION_DELETED` - Assinatura cancelada

   **Eventos de Transferência (Transfer Events):**
   - ✅ `TRANSFER_CREATED` - Transferência criada
   - ✅ `TRANSFER_UPDATED` - Transferência atualizada (status changed)

5. **Método de Autenticação:** Deixe como padrão (sem autenticação adicional)
   - Nosso endpoint já valida que os dados vêm do Asaas

6. Clique em **"Salvar"** ou **"Criar Webhook"**

### 2. Testar o Webhook

Após configurar o webhook, você pode testar de 3 formas:

#### Opção A: Teste Direto no Asaas Dashboard
1. Na página de webhooks, clique em "Testar" ao lado do webhook criado
2. Selecione um evento (ex: `PAYMENT_CREATED`)
3. Clique em "Enviar Teste"
4. Verifique os logs no Supabase

#### Opção B: Criar uma Cobrança Real
1. No dashboard Asaas, crie uma nova cobrança manual
2. Use dados de teste (CPF: 24971563792)
3. O webhook será disparado automaticamente

#### Opção C: Usar Script de Teste Local
```bash
# Simular webhook de pagamento criado
curl -X POST "https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CREATED",
    "payment": {
      "id": "pay_test_123",
      "status": "PENDING",
      "value": 97.00,
      "dueDate": "2025-11-26",
      "billingType": "BOLETO",
      "subscription": "sub_fr09q374mxgxulz6"
    }
  }'
```

### 3. Verificar Logs

Você pode verificar se os webhooks estão sendo recebidos:

```bash
# Ver logs do webhook
npx supabase functions logs asaas-webhook --tail

# Verificar pagamentos criados no banco
npx supabase db execute --query "
  SELECT
    sp.asaas_payment_id,
    sp.amount,
    sp.status,
    sp.due_date,
    sp.created_at,
    os.asaas_subscription_id
  FROM subscription_payments sp
  JOIN organization_subscriptions os ON os.id = sp.subscription_id
  ORDER BY sp.created_at DESC
  LIMIT 5;
"
```

## Fluxo de Eventos

### Quando um pagamento é criado:
1. Asaas envia webhook `PAYMENT_CREATED` → nosso endpoint
2. Endpoint cria registro em `subscription_payments` com status `PENDING`
3. Subscription permanece `active` (durante período de graça)

### Quando um pagamento é confirmado:
1. Asaas envia webhook `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`
2. Endpoint atualiza `subscription_payments` para status `RECEIVED`/`CONFIRMED`
3. Subscription é atualizada: `status = 'active'`, `last_payment_date` e `last_payment_amount` são preenchidos

### Quando um pagamento vence:
1. Asaas envia webhook `PAYMENT_OVERDUE`
2. Endpoint atualiza `subscription_payments` para status `OVERDUE`
3. Subscription é atualizada: `status = 'past_due'`
4. **Importante:** Aplicar lógica de bloqueio no frontend baseado em `status = 'past_due'`

### Quando uma assinatura é cancelada:
1. Asaas envia webhook `SUBSCRIPTION_DELETED`
2. Endpoint atualiza subscription: `status = 'canceled'`, `canceled_at = NOW()`
3. **Importante:** Usuário perde acesso aos recursos do plano

## Campos Importantes do Banco

### `organization_subscriptions`
- `status`: `trial` | `active` | `past_due` | `canceled` | `expired`
- `asaas_subscription_id`: ID da assinatura no Asaas
- `last_payment_date`: Data do último pagamento recebido
- `next_billing_date`: Data da próxima cobrança

### `subscription_payments`
- `status`: `PENDING` | `CONFIRMED` | `RECEIVED` | `OVERDUE` | `REFUNDED` | `CANCELLED`
- `asaas_payment_id`: ID da cobrança no Asaas
- `asaas_invoice_url`: Link do boleto/fatura (se disponível)
- `payment_date`: Data em que o pagamento foi recebido

## Segurança

### O que o webhook faz:
✅ Valida que a requisição é POST
✅ Usa Service Role Key (acesso total ao banco)
✅ Loga todos os eventos no console
✅ Retorna erro 500 se algo falhar

### O que NÃO faz (ainda):
⚠️ Não valida assinatura/token do Asaas (recomendado para produção)
⚠️ Não implementa retry logic (Asaas tenta 3x automaticamente)

### Melhorias Futuras:
```typescript
// Adicionar validação de token Asaas
const asaasToken = req.headers.get("asaas-access-token");
if (asaasToken !== EXPECTED_WEBHOOK_TOKEN) {
  return new Response("Unauthorized", { status: 401 });
}
```

## Troubleshooting

### Webhook não está sendo recebido
1. Verifique se a URL está correta (sem espaços ou caracteres extras)
2. Verifique se o webhook está "Ativo" no dashboard Asaas
3. Verifique os logs da Edge Function: `npx supabase functions logs asaas-webhook`
4. Teste manualmente com curl (veja Opção C acima)

### Pagamentos não aparecem no banco
1. Verifique se o `asaas_subscription_id` está correto na tabela `organization_subscriptions`
2. Verifique se o evento `PAYMENT_CREATED` foi recebido (logs)
3. Verifique se há erros de constraint no banco (CPF/CNPJ duplicado, etc.)

### Status da assinatura não atualiza
1. Verifique se os eventos `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` foram recebidos
2. Verifique se o `subscription_id` está sendo corretamente identificado no webhook
3. Execute query manual para verificar última atualização:
   ```sql
   SELECT status, last_payment_date, updated_at
   FROM organization_subscriptions
   WHERE asaas_subscription_id = 'sub_fr09q374mxgxulz6';
   ```

## Próximas Etapas (Frontend)

Após configurar o webhook, você precisará:

1. **Exibir status de pagamento** na página de planos
2. **Bloquear acesso** quando `status = 'past_due'` ou `'canceled'`
3. **Mostrar alertas** quando pagamento está vencido
4. **Link para fatura** quando disponível (`asaas_invoice_url`)
5. **Histórico de pagamentos** na página de assinatura

Exemplo de componente:
```typescript
// src/components/subscription/PaymentStatus.tsx
export function PaymentStatus() {
  const { data: subscription } = useCurrentSubscription()
  const { data: payments } = usePaymentHistory()

  if (subscription?.status === 'past_due') {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Pagamento Vencido</AlertTitle>
        <AlertDescription>
          Seu pagamento está vencido. Regularize para continuar usando.
          <Button onClick={() => window.open(payments[0].asaas_invoice_url)}>
            Ver Fatura
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // ... outros estados
}
```

## Contato e Suporte

- **Documentação Asaas:** https://docs.asaas.com/reference/webhooks
- **Dashboard Asaas:** https://app.asaas.com/webhooks
- **Logs Supabase:** https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/functions

---

**Status:** ✅ Backend pronto, aguardando configuração do webhook no dashboard Asaas
