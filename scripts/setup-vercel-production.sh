#!/bin/bash

echo "🚀 Setup Meta Business - Produção Vercel"
echo "========================================"
echo ""
echo "Este script configura as variáveis de ambiente na Vercel"
echo "para a integração Meta Business em PRODUÇÃO."
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
    echo ""
fi

echo "🔐 Fazendo login na Vercel..."
vercel login
echo ""

echo "🔗 Vinculando ao projeto..."
vercel link --yes 2>/dev/null || true
echo ""

echo "⚙️ Configurando variáveis de ambiente para PRODUÇÃO..."
echo ""

# Remover variáveis antigas se existirem
echo "🧹 Limpando variáveis antigas (se existirem)..."
vercel env rm VITE_META_APP_ID production --yes 2>/dev/null || true
vercel env rm VITE_META_APP_SECRET production --yes 2>/dev/null || true
vercel env rm VITE_META_REDIRECT_URI production --yes 2>/dev/null || true
vercel env rm VITE_APP_URL production --yes 2>/dev/null || true

echo ""
echo "➕ Adicionando novas variáveis..."

# Adicionar novas variáveis
echo "1️⃣ VITE_META_APP_ID..."
echo "336112808735379" | vercel env add VITE_META_APP_ID production --yes

echo "2️⃣ VITE_META_APP_SECRET..."
echo "7e6216e859be7639fa4de061536ce944" | vercel env add VITE_META_APP_SECRET production --yes

echo "3️⃣ VITE_META_REDIRECT_URI..."
echo "https://metri-com-flow.vercel.app/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production --yes

echo "4️⃣ VITE_APP_URL..."
echo "https://metri-com-flow.vercel.app" | vercel env add VITE_APP_URL production --yes

echo ""
echo "========================================"
echo "✅ Variáveis configuradas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "   1. Configurar Meta for Developers:"
echo "      🔗 https://developers.facebook.com/apps/336112808735379"
echo ""
echo "      Adicione esta URI de redirecionamento:"
echo "      ✅ https://metri-com-flow.vercel.app/meta-ads-config"
echo ""
echo "   2. Fazer deploy:"
echo "      $ vercel --prod"
echo ""
echo "   3. Testar:"
echo "      🔗 https://metri-com-flow.vercel.app/meta-ads-config"
echo ""
echo "========================================"
echo ""

read -p "Deseja fazer o deploy agora? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]
then
    echo ""
    echo "🚀 Iniciando deploy para produção..."
    vercel --prod
    echo ""
    echo "✅ Deploy concluído!"
    echo "🔗 Acesse: https://metri-com-flow.vercel.app/meta-ads-config"
else
    echo ""
    echo "⏭️  Deploy cancelado."
    echo "Execute 'vercel --prod' quando estiver pronto."
fi

echo ""
