#!/bin/bash

# Script para testar a conexão com o Meta antes do OAuth
# Uso: ./scripts/test-meta-connection.sh

set -e

echo "🧪 Testando configuração do Meta Business"
echo "=========================================="
echo ""

# Carregar variáveis do .env
if [ -f .env ]; then
    source .env
fi

META_APP_ID="${VITE_META_APP_ID:-336112808735379}"
REDIRECT_URI="${VITE_META_REDIRECT_URI:-http://localhost:8082/meta-ads-config}"

echo "📋 Configuração atual:"
echo "   App ID: $META_APP_ID"
echo "   Redirect URI: $REDIRECT_URI"
echo ""

# Verificar se o App ID é válido
echo "1️⃣ Verificando formato do App ID..."
if [[ ! "$META_APP_ID" =~ ^[0-9]+$ ]]; then
    echo "   ❌ App ID inválido (deve ser numérico): $META_APP_ID"
    exit 1
else
    echo "   ✅ App ID é numérico"
fi

# Testar se o App existe na Meta
echo ""
echo "2️⃣ Verificando se o App existe na Meta..."
RESPONSE=$(curl -s "https://graph.facebook.com/v24.0/${META_APP_ID}?fields=id,name&access_token=${META_APP_ID}|${VITE_META_APP_SECRET}")

if echo "$RESPONSE" | grep -q "error"; then
    echo "   ❌ Erro ao buscar informações do App:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
else
    echo "   ✅ App encontrado:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo "3️⃣ Verificando Supabase Secrets..."
npx supabase secrets list | grep META || echo "   ⚠️ Nenhum secret do Meta encontrado"

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "🔗 URL de OAuth que será gerada:"
echo "https://www.facebook.com/v24.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${REDIRECT_URI}&scope=ads_management,ads_read,business_management,leads_retrieval&response_type=code"
echo ""
