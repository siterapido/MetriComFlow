#!/bin/bash

# Script para configurar os secrets do Meta no Supabase
# Uso: ./scripts/setup-meta-secrets.sh

set -e  # Para na primeira falha

echo "🔐 Configurando Secrets do Meta no Supabase"
echo "=============================================="
echo ""

# Configurações do Meta App (InsightFy)
META_APP_ID="3361128087359379"
META_APP_SECRET="7e6216e859be7639fa4de061536ce944"
META_ACCESS_TOKEN="EAAvw7ZA2xD5MBPqL3QcMZC5C7JgxY5E1PLEbzDjSpoONuuTknzJiejKyTIkpQqf8LAoZB1QIbVV4r10gheLZCok97qNYZAiYE0OEhIimKxs9yWgPIOGm5AXvdE5cgRRAVr0CC6nTZAN8yAZAmRPFAfQx1aBnr4OzIPCEd5aGcaKVtE4ZCnes4K4T0ZCvFyMdZCepUCwZAtQIgJw"

echo "📋 Informações do App Meta:"
echo "   Nome: InsightFy"
echo "   App ID: $META_APP_ID"
echo "   App Secret: ${META_APP_SECRET:0:10}..."
echo "   Token válido até: 14/12/2025"
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ Erro: npx não encontrado. Instale o Node.js primeiro."
    exit 1
fi

echo "🗑️  Removendo secrets antigos..."
npx supabase secrets unset META_APP_ID 2>/dev/null || echo "   (META_APP_ID não existia)"
npx supabase secrets unset META_APP_SECRET 2>/dev/null || echo "   (META_APP_SECRET não existia)"
npx supabase secrets unset META_ACCESS_TOKEN 2>/dev/null || echo "   (META_ACCESS_TOKEN não existia)"
echo ""

echo "📝 Configurando novos secrets..."
echo ""

# Configurar todos os secrets de uma vez
echo "1️⃣ Configurando META_APP_ID..."
npx supabase secrets set META_APP_ID="$META_APP_ID"
if [ $? -eq 0 ]; then
    echo "   ✅ META_APP_ID configurado"
else
    echo "   ❌ Erro ao configurar META_APP_ID"
    exit 1
fi

# Configurar META_APP_SECRET
echo ""
echo "2️⃣ Configurando META_APP_SECRET..."
npx supabase secrets set META_APP_SECRET="$META_APP_SECRET"
if [ $? -eq 0 ]; then
    echo "   ✅ META_APP_SECRET configurado"
else
    echo "   ❌ Erro ao configurar META_APP_SECRET"
    exit 1
fi

# Configurar META_ACCESS_TOKEN (token de desenvolvimento)
echo ""
echo "3️⃣ Configurando META_ACCESS_TOKEN (desenvolvimento)..."
npx supabase secrets set META_ACCESS_TOKEN="$META_ACCESS_TOKEN"
if [ $? -eq 0 ]; then
    echo "   ✅ META_ACCESS_TOKEN configurado"
else
    echo "   ❌ Erro ao configurar META_ACCESS_TOKEN"
    exit 1
fi

echo ""
echo "📦 Verificando secrets configurados..."
npx supabase secrets list | grep META

echo ""
echo "✅ Configuração concluída com sucesso!"
echo ""
echo "🔄 IMPORTANTE: Você precisa redesploy da Edge Function para usar os novos secrets:"
echo "   npx supabase functions deploy meta-auth"
echo ""
echo "🧪 Após o deploy, teste a integração:"
echo "   1. Inicie o servidor: npm run dev"
echo "   2. Acesse: http://localhost:8080/meta-ads-config"
echo "   3. Clique em 'Conectar com Meta Business'"
echo ""
