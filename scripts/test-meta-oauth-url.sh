#!/bin/bash

# Script para testar e validar a URL de OAuth do Meta
# Uso: ./scripts/test-meta-oauth-url.sh

set -e

echo "🔍 Testando URL de OAuth do Meta"
echo "=================================="
echo ""

# Carregar variáveis do .env
if [ ! -f .env ]; then
    echo "❌ Erro: Arquivo .env não encontrado!"
    exit 1
fi

export $(grep -v '^#' .env | xargs)

echo "📋 Configurações Locais:"
echo "   VITE_APP_URL: $VITE_APP_URL"
echo "   VITE_META_REDIRECT_URI: $VITE_META_REDIRECT_URI"
echo "   VITE_META_APP_ID: $VITE_META_APP_ID"
echo ""

# Verificar secrets no Supabase
echo "🔐 Verificando Secrets no Supabase:"
npx supabase secrets list | grep -E "(APP_URL|META)" | while read -r line; do
    echo "   $line"
done
echo ""

# Construir URL de OAuth esperada
APP_ID="$VITE_META_APP_ID"
REDIRECT_URI="$VITE_META_REDIRECT_URI"
SCOPES="ads_management,ads_read,business_management,leads_retrieval"
STATE="test-state-12345"

EXPECTED_OAUTH_URL="https://www.facebook.com/v24.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&response_type=code&state=${STATE}"

echo "🔗 URL de OAuth Esperada:"
echo "$EXPECTED_OAUTH_URL"
echo ""

# URL encode para comparação
ENCODED_REDIRECT_URI=$(echo "$REDIRECT_URI" | sed 's/:/%3A/g' | sed 's/\//%2F/g')
echo "📝 Redirect URI (URL encoded):"
echo "$ENCODED_REDIRECT_URI"
echo ""

# Verificar se a URL do Vercel está acessível
echo "🌐 Testando conectividade com Vercel:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$VITE_APP_URL")
echo "   Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ URL acessível"
else
    echo "   ⚠️  URL retornou código $HTTP_CODE"
fi
echo ""

# Testar endpoint /meta-ads-config
echo "🎯 Testando endpoint /meta-ads-config:"
ENDPOINT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${VITE_APP_URL}/meta-ads-config")
echo "   Status Code: $ENDPOINT_CODE"
if [ "$ENDPOINT_CODE" = "200" ] || [ "$ENDPOINT_CODE" = "401" ]; then
    echo "   ✅ Endpoint existe"
else
    echo "   ⚠️  Endpoint retornou código $ENDPOINT_CODE"
fi
echo ""

echo "📋 URLs que devem estar no Meta Developer Console:"
echo "   1. ${VITE_APP_URL}/meta-ads-config"
echo "   2. ${VITE_APP_URL}"
echo "   3. http://localhost:8082/meta-ads-config (para desenvolvimento)"
echo ""

echo "🔗 Link para o Meta Developer Console:"
echo "   https://developers.facebook.com/apps/${APP_ID}/fb-login/settings/"
echo ""

echo "✅ Teste concluído!"
echo ""
echo "📌 PRÓXIMOS PASSOS:"
echo "   1. Acesse: https://developers.facebook.com/apps/${APP_ID}/fb-login/settings/"
echo "   2. Role até 'Valid OAuth Redirect URIs'"
echo "   3. Adicione as URLs listadas acima"
echo "   4. Clique em 'Save Changes'"
echo "   5. Aguarde 2-5 minutos para propagação"
echo ""
