# Configuração do Webhook do Asaas

Este guia explica como configurar o webhook do Asaas para receber notificações de pagamentos e assinaturas no InsightFy.

## URL do Webhook

**Produção:**
```
https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook
```

## Eventos Suportados

A Edge Function `asaas-webhook` processa os seguintes eventos:

### Eventos de Pagamento
- `PAYMENT_CREATED` - Pagamento criado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_REFUNDED` - Pagamento estornado
- `PAYMENT_DELETED` - Pagamento deletado

### Eventos de Assinatura
- `SUBSCRIPTION_CREATED` - Assinatura criada
- `SUBSCRIPTION_UPDATED` - Assinatura atualizada
- `SUBSCRIPTION_DELETED` - Assinatura deletada

## Como Configurar no Painel do Asaas

1. Acesse o painel do Asaas: https://www.asaas.com
2. Vá em **Configurações → Webhooks**
3. Clique em **Novo Webhook**
4. Configure os seguintes campos:
   - **URL:** `https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook`
   - **Eventos:** Selecione todos os eventos de **Pagamento** e **Assinatura**
   - **Token de Acesso (Opcional):** Deixe vazio ou configure um token personalizado
5. Clique em **Salvar**

## Autenticação (Opcional)

### Token Personalizado

Se desejar adicionar autenticação adicional via token:

1. **Gere um token seguro:**
   ```bash
   openssl rand -base64 32
   ```

2. **Configure o token como secret no Supabase:**
   ```bash
   npx supabase secrets set ASAAS_WEBHOOK_TOKEN="seu-token-aqui"
   ```

3. **Configure o token no Asaas:**
   - No painel do Asaas, ao criar/editar o webhook
   - Campo: **Token de Acesso**
   - Valor: o token gerado no passo 1

4. **Deploy a função atualizada:**
   ```bash
   npx supabase functions deploy asaas-webhook --no-verify-jwt
   ```

**IMPORTANTE:** O token é enviado pelo Asaas no header `asaas-access-token`.

## Testando o Webhook

### 1. Teste Manual via cURL

```bash
curl -X POST "https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook" \
  -H "Content-Type: application/json" \
  -d '{
  "event": "PAYMENT_CREATED",
  "payment": {
    "id": "pay_test_001",
    "subscription": "sub_fr09q374mxgxulz6",
    "value": 97,
    "status": "PENDING",
    "dueDate": "2025-11-26",
    "invoiceUrl": "https://www.asaas.com/i/test",
    "externalReference": "uuid-da-subscription-no-supabase",
    "billingType": "BOLETO"
  }
}'
```

**Resposta esperada:** `{"success":true}`

### 2. Teste no Painel do Asaas

1. No painel do Asaas, vá em **Configurações → Webhooks**
2. Encontre o webhook configurado
3. Clique em **Testar** (botão de play)
4. Verifique se o status é **200 OK** ou **Success**

### 3. Verificar Logs no Supabase

```bash
# Verificar logs da função
npx supabase functions logs asaas-webhook
```

Ou via Dashboard:
1. Acesse: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/functions
2. Clique em **asaas-webhook**
3. Vá em **Logs**

## Fluxo de Processamento

### 1. Evento de Pagamento

```
Asaas → POST /asaas-webhook
       ↓
  Parse payload
       ↓
  Buscar subscription por:
  - payment.externalReference (UUID)
  - payment.subscription (Asaas ID)
       ↓
  Upsert subscription_payments
       ↓
  Atualizar status da organization_subscriptions:
  - PAYMENT_RECEIVED → status: "active"
  - PAYMENT_OVERDUE → status: "past_due"
```

### 2. Evento de Assinatura

```
Asaas → POST /asaas-webhook
       ↓
  Parse payload
       ↓
  Buscar subscription por:
  - subscription.id (Asaas ID)
  - subscription.externalReference (UUID)
       ↓
  Atualizar organization_subscriptions:
  - status (active/expired/canceled)
  - next_billing_date
  - canceled_at (se deleted = true)
```

## Solução de Problemas

### Erro 401: "Missing authorization header"

**Causa:** A função estava configurada para exigir autenticação JWT do Supabase.

**Solução:** A função foi deployada com `--no-verify-jwt` para permitir requisições públicas do Asaas.

```bash
npx supabase functions deploy asaas-webhook --no-verify-jwt
```

### Erro 500: "invalid input syntax for type uuid"

**Causa:** O campo `externalReference` não contém um UUID válido de uma subscription existente.

**Soluções:**
1. Certifique-se de que o `externalReference` na criação da assinatura no Asaas é o UUID da `organization_subscriptions`
2. Verifique se a subscription existe no banco:
   ```sql
   SELECT id, organization_id, status, asaas_subscription_id
   FROM organization_subscriptions
   WHERE id = 'uuid-aqui';
   ```

### Subscription não encontrada

**Causa:** O webhook não consegue encontrar a subscription no banco.

**Debug:**
1. Verifique os logs da função:
   ```bash
   npx supabase functions logs asaas-webhook
   ```

2. Confirme que a subscription foi criada no banco:
   ```sql
   SELECT * FROM organization_subscriptions
   WHERE asaas_subscription_id = 'sub_fr09q374mxgxulz6';
   ```

3. Verifique se o `externalReference` está correto no Asaas

### Webhook não está sendo chamado

**Possíveis causas:**
1. URL incorreta no painel do Asaas
2. Eventos não selecionados
3. Webhook desativado no Asaas

**Verificação:**
1. Teste manual com cURL (veja seção "Testando o Webhook")
2. Verifique no painel do Asaas: **Configurações → Webhooks → Logs**
3. Confirme que o webhook está **ativo** (toggle ligado)

## Segurança

### Opções de Proteção

1. **Token de Acesso (Recomendado):**
   - Configure `ASAAS_WEBHOOK_TOKEN` como secret
   - Adicione o mesmo token no painel do Asaas
   - A função valida automaticamente o header `asaas-access-token`

2. **Validação de IP (Futuro):**
   - Whitelist dos IPs do Asaas na Edge Function
   - Requer atualização do código

3. **Validação de Assinatura HMAC (Futuro):**
   - Asaas envia assinatura no header
   - Validar integridade do payload

## Monitoramento

### Métricas Importantes

1. **Taxa de Sucesso:**
   - Verifique nos logs quantos webhooks retornam `{"success":true}`

2. **Latência:**
   - Tempo de resposta da função (target: < 3s)

3. **Erros Comuns:**
   - Erro 500: Subscription não encontrada
   - Erro 400: Payload inválido

### Alertas Recomendados

Configure alertas para:
- Taxa de erro > 10% em 1 hora
- Latência > 5s (percentil 95)
- Webhook não recebido em 24h (quando houver assinaturas ativas)

## Referências

- [Documentação de Webhooks do Asaas](https://docs.asaas.com/reference/webhooks)
- [Edge Functions do Supabase](https://supabase.com/docs/guides/functions)
- Código: [supabase/functions/asaas-webhook/index.ts](supabase/functions/asaas-webhook/index.ts)
