#!/bin/bash

# Script de Teste - Asaas Webhook
# Este script simula um webhook do Asaas sendo recebido

echo "🧪 Testando webhook do Asaas..."
echo ""

# URL da Edge Function
WEBHOOK_URL="https://mmfuzxqglgfmotgikqav.supabase.co/functions/v1/asaas-webhook"

# Payload de teste - Simula um PAYMENT_RECEIVED
PAYLOAD='{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_test_12345",
    "status": "RECEIVED",
    "value": 97.00,
    "dueDate": "2024-11-27",
    "paymentDate": "2024-11-27T10:30:00Z",
    "billingType": "BOLETO",
    "invoiceUrl": "https://www.asaas.com/invoice/test",
    "subscription": "sub_test_67890",
    "externalReference": "test-subscription-id"
  }
}'

echo "📤 Enviando webhook para: $WEBHOOK_URL"
echo ""
echo "📦 Payload:"
echo "$PAYLOAD" | jq .
echo ""

# Enviar webhook
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "📥 Resposta:"
echo "$RESPONSE" | jq .
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Webhook processado com sucesso!"
else
  echo "❌ Erro ao processar webhook"
  exit 1
fi
