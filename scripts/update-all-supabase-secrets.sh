#!/bin/bash

# Script para atualizar TODOS os secrets no Supabase
# Uso: ./scripts/update-all-supabase-secrets.sh

set -e  # Para na primeira falha

echo "🔐 Atualizando TODOS os Secrets no Supabase"
echo "=============================================="
echo ""

# Ler variáveis do .env
if [ ! -f .env ]; then
    echo "❌ Erro: Arquivo .env não encontrado!"
    exit 1
fi

# Carregar variáveis do .env
export $(grep -v '^#' .env | xargs)

echo "📋 Variáveis a serem configuradas:"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "   APP_URL: $VITE_APP_URL"
echo "   Meta App ID: $VITE_META_APP_ID"
echo "   Meta App Secret: ${VITE_META_APP_SECRET:0:10}..."
echo "   Stripe Secret Key: ${STRIPE_SECRET_KEY:0:20}..."
echo ""

# Verificar se o Supabase CLI está disponível
if ! command -v npx &> /dev/null; then
    echo "❌ Erro: npx não encontrado. Instale o Node.js primeiro."
    exit 1
fi

echo "🗑️  Removendo secrets antigos (se existirem)..."
echo ""

# Lista de todos os secrets a serem configurados
# Nota: Supabase não permite secrets com prefixo SUPABASE_
declare -a secrets=(
    "PROJECT_URL"
    "SERVICE_ROLE_KEY"
    "APP_URL"
    "META_APP_ID"
    "META_APP_SECRET"
    "META_ACCESS_TOKEN"
    "META_WEBHOOK_VERIFY_TOKEN"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

# Remover secrets antigos
for secret in "${secrets[@]}"; do
    npx supabase secrets unset "$secret" 2>/dev/null || echo "   ($secret não existia)"
done

echo ""
echo "📝 Configurando novos secrets..."
echo ""

# Contador
count=1

echo "ℹ️  Nota: Supabase não permite secrets com prefixo SUPABASE_"
echo "   Usando aliases: PROJECT_URL e SERVICE_ROLE_KEY"
echo ""

# 1. PROJECT_URL (alias para SUPABASE_URL usado nas Edge Functions)
echo "${count}️⃣ Configurando PROJECT_URL..."
npx supabase secrets set PROJECT_URL="$SUPABASE_URL"
if [ $? -eq 0 ]; then
    echo "   ✅ PROJECT_URL configurado"
else
    echo "   ❌ Erro ao configurar PROJECT_URL"
    exit 1
fi
((count++))
echo ""

# 2. SERVICE_ROLE_KEY (alias usado nas Edge Functions)
echo "${count}️⃣ Configurando SERVICE_ROLE_KEY..."
npx supabase secrets set SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
if [ $? -eq 0 ]; then
    echo "   ✅ SERVICE_ROLE_KEY configurado"
else
    echo "   ❌ Erro ao configurar SERVICE_ROLE_KEY"
    exit 1
fi
((count++))
echo ""

# 3. APP_URL
echo "${count}️⃣ Configurando APP_URL..."
npx supabase secrets set APP_URL="$VITE_APP_URL"
if [ $? -eq 0 ]; then
    echo "   ✅ APP_URL configurado"
else
    echo "   ❌ Erro ao configurar APP_URL"
    exit 1
fi
((count++))
echo ""

# 7. META_APP_ID
echo "${count}️⃣ Configurando META_APP_ID..."
npx supabase secrets set META_APP_ID="$VITE_META_APP_ID"
if [ $? -eq 0 ]; then
    echo "   ✅ META_APP_ID configurado"
else
    echo "   ❌ Erro ao configurar META_APP_ID"
    exit 1
fi
((count++))
echo ""

# 8. META_APP_SECRET
echo "${count}️⃣ Configurando META_APP_SECRET..."
npx supabase secrets set META_APP_SECRET="$VITE_META_APP_SECRET"
if [ $? -eq 0 ]; then
    echo "   ✅ META_APP_SECRET configurado"
else
    echo "   ❌ Erro ao configurar META_APP_SECRET"
    exit 1
fi
((count++))
echo ""

# 9. META_ACCESS_TOKEN (se definido no .env)
if [ -n "$META_ACCESS_TOKEN" ]; then
    echo "${count}️⃣ Configurando META_ACCESS_TOKEN..."
    npx supabase secrets set META_ACCESS_TOKEN="$META_ACCESS_TOKEN"
    if [ $? -eq 0 ]; then
        echo "   ✅ META_ACCESS_TOKEN configurado"
    else
        echo "   ❌ Erro ao configurar META_ACCESS_TOKEN"
        exit 1
    fi
    ((count++))
    echo ""
else
    echo "⚠️  META_ACCESS_TOKEN não definido no .env (pular)"
    echo ""
fi

# 10. META_WEBHOOK_VERIFY_TOKEN (gerar se não existir)
if [ -z "$META_WEBHOOK_VERIFY_TOKEN" ]; then
    META_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 32)
    echo "   ℹ️  Token de verificação gerado automaticamente"
fi
echo "${count}️⃣ Configurando META_WEBHOOK_VERIFY_TOKEN..."
npx supabase secrets set META_WEBHOOK_VERIFY_TOKEN="$META_WEBHOOK_VERIFY_TOKEN"
if [ $? -eq 0 ]; then
    echo "   ✅ META_WEBHOOK_VERIFY_TOKEN configurado"
else
    echo "   ❌ Erro ao configurar META_WEBHOOK_VERIFY_TOKEN"
    exit 1
fi
((count++))
echo ""

# 11. STRIPE_SECRET_KEY
echo "${count}️⃣ Configurando STRIPE_SECRET_KEY..."
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
if [ $? -eq 0 ]; then
    echo "   ✅ STRIPE_SECRET_KEY configurado"
else
    echo "   ❌ Erro ao configurar STRIPE_SECRET_KEY"
    exit 1
fi
((count++))
echo ""

# 12. STRIPE_WEBHOOK_SECRET
echo "${count}️⃣ Configurando STRIPE_WEBHOOK_SECRET..."
npx supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
if [ $? -eq 0 ]; then
    echo "   ✅ STRIPE_WEBHOOK_SECRET configurado"
else
    echo "   ❌ Erro ao configurar STRIPE_WEBHOOK_SECRET"
    exit 1
fi
((count++))
echo ""

echo "📦 Verificando secrets configurados..."
npx supabase secrets list
echo ""

echo "✅ Configuração concluída com sucesso!"
echo ""
echo "🔄 IMPORTANTE: Redesploy das Edge Functions recomendado:"
echo "   npx supabase functions deploy"
echo ""
echo "   Ou individualmente:"
echo "   npx supabase functions deploy meta-auth"
echo "   npx supabase functions deploy connect-ad-account"
echo "   npx supabase functions deploy sync-daily-insights"
echo "   npx supabase functions deploy send-team-invitation"
echo "   npx supabase functions deploy accept-invitation"
echo ""
