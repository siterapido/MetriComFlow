#!/bin/bash

# Script para testar a configuração do Meta OAuth
# Verifica se as URLs estão configuradas corretamente

set -e

echo "🧪 Testando Configuração do Meta OAuth"
echo "========================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar URL
test_url() {
    local url=$1
    local expected_code=$2
    local description=$3

    echo -n "Testing: $description... "
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code, expected $expected_code)"
        return 1
    fi
}

# Função para verificar variável de ambiente no Vercel
check_vercel_env() {
    local var_name=$1
    local expected_value=$2

    echo -n "Checking Vercel env: $var_name... "

    if vercel env ls production 2>/dev/null | grep -q "$var_name"; then
        echo -e "${GREEN}✓ SET${NC}"
        return 0
    else
        echo -e "${RED}✗ NOT SET${NC}"
        return 1
    fi
}

# Função para verificar Supabase secret
check_supabase_secret() {
    local secret_name=$1

    echo -n "Checking Supabase secret: $secret_name... "

    if npx supabase secrets list 2>/dev/null | grep -q "$secret_name"; then
        echo -e "${GREEN}✓ SET${NC}"
        return 0
    else
        echo -e "${RED}✗ NOT SET${NC}"
        return 1
    fi
}

# URLs para testar
PRODUCTION_URL="https://www.insightfy.com.br"
LOCAL_URL="http://localhost:8082"

echo "📍 URLs de Produção"
echo "-------------------"
test_url "$PRODUCTION_URL" "200" "Production domain"
test_url "$PRODUCTION_URL/meta-ads-config" "200" "Meta OAuth redirect page"
echo ""

echo "🔧 Variáveis de Ambiente (Vercel)"
echo "----------------------------------"
check_vercel_env "VITE_APP_URL"
check_vercel_env "VITE_META_REDIRECT_URI"
check_vercel_env "VITE_META_APP_ID"
check_vercel_env "VITE_META_APP_SECRET"
check_vercel_env "VITE_SUPABASE_URL"
check_vercel_env "VITE_SUPABASE_ANON_KEY"
echo ""

echo "🔐 Secrets do Supabase"
echo "----------------------"
check_supabase_secret "META_APP_ID"
check_supabase_secret "META_APP_SECRET"
echo ""

echo "⚡ Edge Functions"
echo "-----------------"
echo -n "Checking meta-auth function... "
if npx supabase functions list 2>/dev/null | grep -q "meta-auth.*ACTIVE"; then
    echo -e "${GREEN}✓ ACTIVE${NC}"
else
    echo -e "${RED}✗ INACTIVE${NC}"
fi

echo -n "Checking connect-ad-account function... "
if npx supabase functions list 2>/dev/null | grep -q "connect-ad-account.*ACTIVE"; then
    echo -e "${GREEN}✓ ACTIVE${NC}"
else
    echo -e "${RED}✗ INACTIVE${NC}"
fi
echo ""

echo "📋 URLs que devem estar no Meta Developer Console"
echo "---------------------------------------------------"
echo "App ID: 336112808735379"
echo "URL: https://developers.facebook.com/apps/336112808735379/settings/basic/"
echo ""
echo "URIs de redirecionamento OAuth válidos:"
echo "1. $PRODUCTION_URL/meta-ads-config"
echo "2. http://localhost:8082/meta-ads-config"
echo ""

echo "✅ Testes Concluídos!"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "Verifique manualmente se as URLs acima estão cadastradas no Meta Developer Console"
echo "Acesse: https://developers.facebook.com/apps/336112808735379/settings/basic/"
echo ""
