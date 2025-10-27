#!/bin/bash

# Script para atualizar as URLs de redirecionamento OAuth do Meta no Vercel
# Este script configura as URLs corretas para produção

set -e

echo "🔧 Atualizando URLs OAuth do Meta no Vercel..."
echo ""

# URL de produção atual (mais recente)
PRODUCTION_URL="https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app"

# URLs que devem estar configuradas no Meta OAuth
echo "📋 URLs que devem ser configuradas no Meta Developer Console:"
echo "   https://developers.facebook.com/apps/336112808735379/settings/basic/"
echo ""
echo "   URIs de redirecionamento OAuth válidos:"
echo "   1. ${PRODUCTION_URL}/meta-ads-config"
echo "   2. http://localhost:8082/meta-ads-config (para desenvolvimento)"
echo ""

# Atualizar variáveis de ambiente no Vercel
echo "🚀 Atualizando variáveis no Vercel..."
echo ""

# Remover variáveis antigas (se existirem)
echo "🗑️  Removendo variáveis antigas..."
vercel env rm VITE_APP_URL production -y 2>/dev/null || true
vercel env rm VITE_META_REDIRECT_URI production -y 2>/dev/null || true

# Adicionar novas variáveis
echo "➕ Adicionando novas variáveis..."
echo "${PRODUCTION_URL}" | vercel env add VITE_APP_URL production
echo "${PRODUCTION_URL}/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production

echo ""
echo "✅ Variáveis atualizadas no Vercel!"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Acesse o Meta Developer Console:"
echo "   https://developers.facebook.com/apps/336112808735379/settings/basic/"
echo ""
echo "2. Role até 'URIs de redirecionamento OAuth válidos'"
echo ""
echo "3. Adicione as seguintes URLs (uma por linha):"
echo "   ${PRODUCTION_URL}/meta-ads-config"
echo "   http://localhost:8082/meta-ads-config"
echo ""
echo "4. Clique em 'Salvar alterações' no Meta Developer Console"
echo ""
echo "5. Faça um novo deploy no Vercel para aplicar as variáveis:"
echo "   vercel --prod"
echo ""
echo "⚠️  IMPORTANTE: As URLs devem corresponder EXATAMENTE entre:"
echo "   - Meta Developer Console (URIs de redirecionamento)"
echo "   - Variáveis de ambiente do Vercel (VITE_META_REDIRECT_URI)"
echo "   - Edge Function meta-auth (redirect_uri)"
echo ""
