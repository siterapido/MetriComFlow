#!/bin/bash

# Script para atualizar variáveis de ambiente na Vercel
# Para produção do MetriCom Flow

echo "🚀 Atualizando Variáveis de Ambiente na Vercel - Produção"
echo "=========================================================="
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não está instalado."
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

echo "🔐 Faça login na Vercel (se necessário):"
vercel login

echo ""
echo "📝 Configurando variáveis de ambiente para PRODUÇÃO..."
echo ""

# Meta Business Configuration
echo "1️⃣ Configurando VITE_META_APP_ID..."
echo "336112808735379" | vercel env add VITE_META_APP_ID production --yes 2>/dev/null || \
vercel env rm VITE_META_APP_ID production --yes && echo "336112808735379" | vercel env add VITE_META_APP_ID production --yes

echo "2️⃣ Configurando VITE_META_APP_SECRET..."
echo "7e6216e859be7639fa4de061536ce944" | vercel env add VITE_META_APP_SECRET production --yes 2>/dev/null || \
vercel env rm VITE_META_APP_SECRET production --yes && echo "7e6216e859be7639fa4de061536ce944" | vercel env add VITE_META_APP_SECRET production --yes

echo "3️⃣ Configurando VITE_META_REDIRECT_URI..."
echo "https://metri-com-flow.vercel.app/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production --yes 2>/dev/null || \
vercel env rm VITE_META_REDIRECT_URI production --yes && echo "https://metri-com-flow.vercel.app/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production --yes

echo "4️⃣ Configurando VITE_APP_URL..."
echo "https://metri-com-flow.vercel.app" | vercel env add VITE_APP_URL production --yes 2>/dev/null || \
vercel env rm VITE_APP_URL production --yes && echo "https://metri-com-flow.vercel.app" | vercel env add VITE_APP_URL production --yes

echo ""
echo "=========================================================="
echo "✅ Variáveis de ambiente configuradas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Fazer deploy: vercel --prod"
echo "   2. Ou fazer push para main: git push (deploy automático)"
echo "   3. Testar em: https://metri-com-flow.vercel.app/meta-ads-config"
echo ""
echo "🔗 Links úteis:"
echo "   - Dashboard Vercel: https://vercel.com"
echo "   - Meta for Developers: https://developers.facebook.com/apps/336112808735379"
echo ""
