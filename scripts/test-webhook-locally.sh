#!/bin/bash

# Test Asaas Webhook Locally
# This script simulates webhook events from Asaas to test the webhook handler

WEBHOOK_URL="https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook"
SUBSCRIPTION_ID="sub_fr09q374mxgxulz6"

# Get anon key from .env
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_ANON_KEY not found in .env"
  exit 1
fi

echo "🧪 Testing Asaas Webhook Handler"
echo "================================="
echo ""

# Test 1: PAYMENT_CREATED
echo "📝 Test 1: PAYMENT_CREATED event"
echo "--------------------------------"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"event\": \"PAYMENT_CREATED\",
    \"payment\": {
      \"id\": \"pay_test_$(date +%s)\",
      \"status\": \"PENDING\",
      \"value\": 97.00,
      \"dueDate\": \"2025-11-26\",
      \"billingType\": \"BOLETO\",
      \"invoiceUrl\": \"https://www.asaas.com/i/test123\",
      \"subscription\": \"$SUBSCRIPTION_ID\"
    }
  }"
echo ""
echo ""

# Wait a bit
sleep 2

# Test 2: PAYMENT_CONFIRMED (Credit Card)
echo "💳 Test 2: PAYMENT_CONFIRMED event"
echo "-----------------------------------"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"event\": \"PAYMENT_CONFIRMED\",
    \"payment\": {
      \"id\": \"pay_test_$(date +%s)\",
      \"status\": \"CONFIRMED\",
      \"value\": 97.00,
      \"dueDate\": \"2025-11-26\",
      \"paymentDate\": \"$(date -u +"%Y-%m-%d")\",
      \"billingType\": \"CREDIT_CARD\",
      \"subscription\": \"$SUBSCRIPTION_ID\"
    }
  }"
echo ""
echo ""

# Wait a bit
sleep 2

# Test 3: PAYMENT_RECEIVED (PIX/Boleto)
echo "✅ Test 3: PAYMENT_RECEIVED event"
echo "----------------------------------"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"event\": \"PAYMENT_RECEIVED\",
    \"payment\": {
      \"id\": \"pay_test_$(date +%s)\",
      \"status\": \"RECEIVED\",
      \"value\": 97.00,
      \"dueDate\": \"2025-11-26\",
      \"paymentDate\": \"$(date -u +"%Y-%m-%d")\",
      \"billingType\": \"PIX\",
      \"subscription\": \"$SUBSCRIPTION_ID\"
    }
  }"
echo ""
echo ""

# Wait a bit
sleep 2

# Test 4: PAYMENT_OVERDUE
echo "⚠️  Test 4: PAYMENT_OVERDUE event"
echo "----------------------------------"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"event\": \"PAYMENT_OVERDUE\",
    \"payment\": {
      \"id\": \"pay_test_$(date +%s)\",
      \"status\": \"OVERDUE\",
      \"value\": 97.00,
      \"dueDate\": \"2025-10-26\",
      \"billingType\": \"BOLETO\",
      \"subscription\": \"$SUBSCRIPTION_ID\"
    }
  }"
echo ""
echo ""

# Wait a bit
sleep 2

# Test 5: SUBSCRIPTION_UPDATED
echo "🔄 Test 5: SUBSCRIPTION_UPDATED event"
echo "--------------------------------------"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"event\": \"SUBSCRIPTION_UPDATED\",
    \"subscription\": {
      \"id\": \"$SUBSCRIPTION_ID\",
      \"status\": \"ACTIVE\",
      \"value\": 97.00,
      \"nextDueDate\": \"2025-12-26\",
      \"cycle\": \"MONTHLY\",
      \"deleted\": false
    }
  }"
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "📊 Check results:"
echo "1. View webhook logs: npx supabase functions logs asaas-webhook"
echo "2. Check payments in database:"
echo "   npx supabase db execute --query \"SELECT * FROM subscription_payments ORDER BY created_at DESC LIMIT 5;\""
echo "3. Check subscription status:"
echo "   npx supabase db execute --query \"SELECT status, last_payment_date FROM organization_subscriptions WHERE asaas_subscription_id = '$SUBSCRIPTION_ID';\""
