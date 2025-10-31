#!/bin/bash

# Script para atualizar as URLs de OAuth no Meta App
# Uso: ./scripts/update-meta-oauth-urls.sh

set -e

echo "🔧 Atualizando URLs de OAuth no Meta App"
echo "=========================================="
echo ""

# Carregar variáveis do .env
if [ ! -f .env ]; then
    echo "❌ Erro: Arquivo .env não encontrado!"
    exit 1
fi

export $(grep -v '^#' .env | xargs)

APP_ID="$VITE_META_APP_ID"
APP_SECRET="$VITE_META_APP_SECRET"
REDIRECT_URI="$VITE_META_REDIRECT_URI"

echo "📋 Informações do App:"
echo "   App ID: $APP_ID"
echo "   Redirect URI: $REDIRECT_URI"
echo ""

# Gerar access token do app
echo "🔑 Gerando App Access Token..."
APP_TOKEN_RESPONSE=$(curl -s -X GET \
  "https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials")

APP_TOKEN=$(echo "$APP_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$APP_TOKEN" ]; then
    echo "❌ Erro: Não foi possível gerar o access token"
    echo "Resposta da API: $APP_TOKEN_RESPONSE"
    exit 1
fi

echo "   ✅ Token gerado: ${APP_TOKEN:0:20}..."
echo ""

echo "⚠️  ATENÇÃO: Configuração de OAuth Redirect URIs via API"
echo "=========================================================="
echo ""
echo "A Meta não permite atualizar 'OAuth Redirect URIs' via API Graph diretamente."
echo "Você PRECISA configurar manualmente no Facebook Developers Console."
echo ""
echo "📋 URLs que você deve adicionar:"
echo ""
echo "   1. ${VITE_APP_URL}/meta-ads-config"
echo "   2. ${VITE_APP_URL}"
echo "   3. http://localhost:8082/meta-ads-config"
echo ""
echo "🔗 Acesse o console aqui:"
echo "   https://developers.facebook.com/apps/${APP_ID}/fb-login/settings/"
echo ""
echo "📝 Passo a passo:"
echo "   1. Clique no link acima para abrir o console"
echo "   2. No menu lateral, vá em 'Use Cases' → 'Authentication and account creation'"
echo "      OU vá em 'Settings' → 'Basic'"
echo "   3. Procure por 'Valid OAuth Redirect URIs'"
echo "   4. Adicione cada URL em uma linha separada"
echo "   5. Clique em 'Save Changes' no final da página"
echo "   6. Aguarde 2-5 minutos para propagação"
echo ""
echo "🔍 Verificando configuração atual do app..."
echo ""

# Tentar buscar informações do app
APP_INFO=$(curl -s -X GET \
  "https://graph.facebook.com/v24.0/${APP_ID}?fields=name,namespace,link&access_token=${APP_TOKEN}")

echo "📱 Informações do App:"
echo "$APP_INFO" | python3 -m json.tool 2>/dev/null || echo "$APP_INFO"
echo ""

echo "✅ Script concluído!"
echo ""
