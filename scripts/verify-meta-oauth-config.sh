#!/bin/bash

# Script para verificar a configuração do Meta OAuth
# Este script valida todas as URLs e variáveis de ambiente necessárias

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICAÇÃO DA CONFIGURAÇÃO DO META OAUTH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se uma variável está definida
check_env_var() {
  local var_name=$1
  local var_value=$2
  local is_required=$3

  if [ -z "$var_value" ]; then
    if [ "$is_required" = "true" ]; then
      echo -e "${RED}✗${NC} $var_name: ${RED}NÃO CONFIGURADA${NC} (obrigatória)"
      return 1
    else
      echo -e "${YELLOW}⚠${NC} $var_name: ${YELLOW}NÃO CONFIGURADA${NC} (opcional)"
      return 0
    fi
  else
    echo -e "${GREEN}✓${NC} $var_name: ${GREEN}$var_value${NC}"
    return 0
  fi
}

# Função para verificar URL acessível
check_url_accessible() {
  local url=$1
  local description=$2

  echo -n "  Verificando $description... "

  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
    echo -e "${GREEN}OK${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}ERRO${NC} (HTTP $http_code)"
    return 1
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. VARIÁVEIS DE AMBIENTE LOCAIS (.env)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Carregar .env se existir
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✓${NC} Arquivo .env encontrado"
else
  echo -e "${RED}✗${NC} Arquivo .env não encontrado"
fi

echo ""
check_env_var "VITE_META_APP_ID" "$VITE_META_APP_ID" "true"
check_env_var "VITE_META_REDIRECT_URI" "$VITE_META_REDIRECT_URI" "true"
check_env_var "VITE_APP_URL" "$VITE_APP_URL" "true"
check_env_var "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "true"
check_env_var "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "true"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 2. VARIÁVEIS SUPABASE (Secrets)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Supabase secrets
if command -v npx &> /dev/null; then
  echo "Verificando secrets do Supabase..."

  secrets_output=$(npx supabase secrets list 2>&1 || echo "ERROR")

  if echo "$secrets_output" | grep -q "ERROR\|Not logged in"; then
    echo -e "${RED}✗${NC} Erro ao acessar Supabase secrets. Execute: ${YELLOW}npx supabase login${NC}"
  else
    echo "$secrets_output"

    if echo "$secrets_output" | grep -q "META_APP_ID"; then
      echo -e "${GREEN}✓${NC} META_APP_ID configurado"
    else
      echo -e "${RED}✗${NC} META_APP_ID não configurado"
    fi

    if echo "$secrets_output" | grep -q "META_APP_SECRET"; then
      echo -e "${GREEN}✓${NC} META_APP_SECRET configurado"
    else
      echo -e "${RED}✗${NC} META_APP_SECRET não configurado"
    fi
  fi
else
  echo -e "${YELLOW}⚠${NC} npx não encontrado. Não foi possível verificar secrets do Supabase."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 3. VARIÁVEIS VERCEL (Produção)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v vercel &> /dev/null; then
  echo "Verificando variáveis de ambiente no Vercel..."

  vercel_env=$(vercel env ls 2>&1 || echo "ERROR")

  if echo "$vercel_env" | grep -q "ERROR\|Not authenticated"; then
    echo -e "${RED}✗${NC} Erro ao acessar Vercel. Execute: ${YELLOW}vercel login${NC}"
  else
    if echo "$vercel_env" | grep -q "VITE_APP_URL"; then
      echo -e "${GREEN}✓${NC} VITE_APP_URL configurado no Vercel"
    else
      echo -e "${RED}✗${NC} VITE_APP_URL NÃO configurado no Vercel"
    fi

    if echo "$vercel_env" | grep -q "VITE_META_REDIRECT_URI"; then
      echo -e "${GREEN}✓${NC} VITE_META_REDIRECT_URI configurado no Vercel"
    else
      echo -e "${RED}✗${NC} VITE_META_REDIRECT_URI NÃO configurado no Vercel"
    fi

    if echo "$vercel_env" | grep -q "VITE_META_APP_ID"; then
      echo -e "${GREEN}✓${NC} VITE_META_APP_ID configurado no Vercel"
    else
      echo -e "${RED}✗${NC} VITE_META_APP_ID NÃO configurado no Vercel"
    fi
  fi
else
  echo -e "${YELLOW}⚠${NC} Vercel CLI não encontrado. Instale com: ${YELLOW}npm i -g vercel${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 4. URLS QUE DEVEM ESTAR NO META DEVELOPER CONSOLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}📍 URIs de Redirecionamento OAuth (adicionar TODAS):${NC}"
echo ""
echo "  https://www.insightfy.com.br/meta-ads-config"
echo "  https://insightfy.com.br/meta-ads-config"
echo "  https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config"
echo "  http://localhost:8082/meta-ads-config"
echo ""

echo -e "${BLUE}📍 Domínios do Aplicativo (adicionar TODOS):${NC}"
echo ""
echo "  www.insightfy.com.br"
echo "  insightfy.com.br"
echo "  metri-com-flow-mafcos-projects-ca629a4f.vercel.app"
echo "  localhost"
echo ""

echo -e "${BLUE}📍 Configurações de Login:${NC}"
echo ""
echo "  ✓ Login de OAuth do Cliente: ATIVADO"
echo "  ✓ Login de OAuth da Web: ATIVADO"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 5. TESTES DE CONECTIVIDADE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v curl &> /dev/null; then
  check_url_accessible "https://www.insightfy.com.br" "Produção (www)"
  check_url_accessible "https://insightfy.com.br" "Produção (sem www)"
  check_url_accessible "https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app" "Vercel deployment"
  check_url_accessible "http://localhost:8082" "Local dev server"
else
  echo -e "${YELLOW}⚠${NC} curl não encontrado. Pulando testes de conectividade."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 6. RESUMO E PRÓXIMOS PASSOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}🔧 Ações Necessárias:${NC}"
echo ""
echo "1. ${YELLOW}Meta Developer Console${NC} (https://developers.facebook.com/apps/3361128087359379/):"
echo "   - Adicionar todas as URLs de redirecionamento listadas acima"
echo "   - Adicionar todos os domínios listados acima"
echo "   - Ativar Login de OAuth do Cliente e da Web"
echo ""
echo "2. ${YELLOW}Vercel${NC} (se variáveis não configuradas):"
echo "   - Executar: ./scripts/update-vercel-meta-urls.sh"
echo "   - Ou configurar manualmente via vercel.com/dashboard"
echo ""
echo "3. ${YELLOW}Supabase${NC} (se secrets não configurados):"
echo "   - Executar: ./scripts/setup-meta-secrets.sh"
echo "   - Ou configurar manualmente via supabase.com/dashboard"
echo ""
echo "4. ${YELLOW}Deploy${NC}:"
echo "   - Edge Function: npx supabase functions deploy meta-auth"
echo "   - Frontend: vercel --prod"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verificação concluída!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
