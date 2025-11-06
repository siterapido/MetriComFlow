#!/bin/bash
# Script para configurar variáveis de ambiente no Vercel
# Execute este script no seu terminal LOCAL (não no Claude Code web)

set -e  # Parar em caso de erro

echo "🚀 Configurando variáveis de ambiente no Vercel..."
echo ""

# Verificar se está logado no Vercel
if ! vercel whoami &> /dev/null; then
  echo "❌ Você não está logado no Vercel CLI."
  echo "Execute primeiro: vercel login"
  exit 1
fi

echo "✅ Autenticado no Vercel"
echo ""

# Variáveis para configurar
SUPABASE_URL="https://fjoaliipjfcnokermkhy.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjM4MDUsImV4cCI6MjA3NTk5OTgwNX0.fvbJQAzV9q1NLXXWElbeVneWS3S3LTEigGS-s7cik2Y"
APP_URL="https://www.insightfy.com.br"
META_REDIRECT_URI="https://www.insightfy.com.br/metricas"
META_APP_ID="3361128087359379"

echo "📝 Adicionando variáveis para Production, Preview e Development..."
echo ""

# Função para adicionar variável em todos os ambientes
add_env_var() {
  local name=$1
  local value=$2

  echo "Adding: $name"

  # Production
  echo "$value" | vercel env add "$name" production --yes 2>/dev/null || echo "  ↳ Production: já existe ou erro"

  # Preview
  echo "$value" | vercel env add "$name" preview --yes 2>/dev/null || echo "  ↳ Preview: já existe ou erro"

  # Development
  echo "$value" | vercel env add "$name" development --yes 2>/dev/null || echo "  ↳ Development: já existe ou erro"

  echo "  ✓ Concluído"
  echo ""
}

# Adicionar todas as variáveis
add_env_var "VITE_SUPABASE_URL" "$SUPABASE_URL"
add_env_var "VITE_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
add_env_var "VITE_APP_URL" "$APP_URL"
add_env_var "VITE_META_REDIRECT_URI" "$META_REDIRECT_URI"
add_env_var "VITE_META_APP_ID" "$META_APP_ID"

echo "✅ Todas as variáveis foram configuradas!"
echo ""
echo "📦 Próximo passo: Fazer redeploy do projeto"
echo "   Execute: vercel --prod"
echo ""
echo "   Ou acesse o dashboard e clique em 'Redeploy' no último deployment:"
echo "   https://vercel.com/dashboard"
echo ""
