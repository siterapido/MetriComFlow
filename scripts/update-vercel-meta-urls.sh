#!/bin/bash

# Script para atualizar variáveis de ambiente do Meta Ads no Vercel
# Este script atualiza as URLs de redirecionamento OAuth para produção

set -e

echo "=========================================="
echo "Atualização de URLs Meta Ads no Vercel"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está logado no Vercel
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI não encontrado. Instale com: npm i -g vercel${NC}"
    exit 1
fi

# URLs de produção
PRODUCTION_URL="https://www.insightfy.com.br"
PRODUCTION_REDIRECT_URI="${PRODUCTION_URL}/meta-ads-config"

# Meta App ID (fixo)
META_APP_ID="3361128087359379"

echo -e "${YELLOW}ℹ️  URLs que serão configuradas:${NC}"
echo "   VITE_APP_URL: ${PRODUCTION_URL}"
echo "   VITE_META_REDIRECT_URI: ${PRODUCTION_REDIRECT_URI}"
echo "   VITE_META_APP_ID: ${META_APP_ID}"
echo ""

read -p "Deseja continuar? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 0
fi

echo ""
echo -e "${GREEN}📝 Atualizando variáveis no Vercel...${NC}"
echo ""

# Função para atualizar variável
update_env_var() {
    local var_name=$1
    local var_value=$2

    echo "Atualizando ${var_name}..."

    # Remove variável existente (se houver)
    vercel env rm "$var_name" production --yes 2>/dev/null || true

    # Adiciona nova variável
    echo "$var_value" | vercel env add "$var_name" production --sensitive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${var_name} atualizada com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao atualizar ${var_name}${NC}"
        return 1
    fi
}

# Atualizar variáveis
update_env_var "VITE_APP_URL" "$PRODUCTION_URL"
update_env_var "VITE_META_REDIRECT_URI" "$PRODUCTION_REDIRECT_URI"
update_env_var "VITE_META_APP_ID" "$META_APP_ID"

echo ""
echo -e "${GREEN}✅ Variáveis atualizadas com sucesso!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Ações manuais necessárias${NC}"
echo ""
echo "1️⃣  Configurar URLs no Meta Developer Console:"
echo "   Acesse: https://developers.facebook.com/apps/${META_APP_ID}/settings/basic/"
echo ""
echo "   Adicione as seguintes URLs em 'URIs de redirecionamento OAuth válidos':"
echo "   • ${PRODUCTION_REDIRECT_URI}"
echo "   • https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config"
echo "   • http://localhost:8082/meta-ads-config"
echo ""
echo "2️⃣  Fazer redeploy no Vercel:"
echo "   Execute: vercel --prod"
echo ""
echo "3️⃣  Testar OAuth:"
echo "   Acesse: ${PRODUCTION_URL}/meta-ads-config"
echo "   Clique em 'Conectar Meta Business' e teste o fluxo OAuth"
echo ""
echo "=========================================="
