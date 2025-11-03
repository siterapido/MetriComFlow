#!/bin/bash

# ============================================================================
# SCRIPT: Setup Cron Secrets
# Configura secrets necessárias para os cron jobs funcionarem
# ============================================================================

set -e  # Exit on error

echo "🔧 Configurando secrets para cron jobs..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# 1. Verificar se Supabase CLI está instalado
# ============================================================================

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"

# ============================================================================
# 2. Obter URL do projeto
# ============================================================================

echo ""
echo "📡 Obtendo URL do projeto..."

# Tentar obter do config.toml
PROJECT_URL=$(grep -o 'api_url = ".*"' supabase/config.toml 2>/dev/null | cut -d'"' -f2 || echo "")

if [ -z "$PROJECT_URL" ]; then
    echo -e "${YELLOW}⚠️  URL não encontrada no config.toml${NC}"
    echo "Digite a URL do seu projeto Supabase:"
    echo "Exemplo: https://mmfuzxqglgfmotgikqav.supabase.co"
    read -r PROJECT_URL
fi

# Remover trailing slash
PROJECT_URL=${PROJECT_URL%/}

echo -e "${GREEN}✅ URL do projeto: $PROJECT_URL${NC}"

# ============================================================================
# 3. Obter Service Role Key
# ============================================================================

echo ""
echo "🔑 Service Role Key..."
echo ""
echo "A Service Role Key é necessária para os cron jobs invocarem Edge Functions."
echo "Você pode encontrá-la em:"
echo "  Supabase Dashboard > Settings > API > service_role key (secret)"
echo ""
echo "Digite a Service Role Key:"
read -rs SERVICE_ROLE_KEY  # -s para não mostrar no terminal

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Service Role Key não pode ser vazia!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Service Role Key configurada${NC}"

# ============================================================================
# 4. Configurar secrets no Supabase
# ============================================================================

echo ""
echo "📤 Enviando secrets para Supabase..."

# Secret 1: URL do projeto
npx supabase secrets set SUPABASE_PROJECT_URL="$PROJECT_URL" --project-ref $(echo $PROJECT_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SUPABASE_PROJECT_URL configurada${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SUPABASE_PROJECT_URL${NC}"
    echo "Tente manualmente: npx supabase secrets set SUPABASE_PROJECT_URL=\"$PROJECT_URL\""
fi

# Secret 2: Service Role Key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" --project-ref $(echo $PROJECT_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY configurada${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SUPABASE_SERVICE_ROLE_KEY${NC}"
    echo "Tente manualmente: npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=\"***\""
fi

# ============================================================================
# 5. Verificar secrets configuradas
# ============================================================================

echo ""
echo "🔍 Verificando secrets configuradas..."
echo ""

npx supabase secrets list --project-ref $(echo $PROJECT_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

# ============================================================================
# 6. Instruções finais
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Aplicar migration dos cron jobs:"
echo "   ${YELLOW}Execute no Supabase SQL Editor:${NC}"
echo "   supabase/migrations/20251202200000_automation_cron_jobs.sql"
echo ""
echo "2. Verificar se os cron jobs foram criados:"
echo "   ${YELLOW}SELECT * FROM cron.job;${NC}"
echo ""
echo "3. Monitorar execução dos jobs:"
echo "   ${YELLOW}SELECT * FROM public.cron_job_logs ORDER BY started_at DESC LIMIT 10;${NC}"
echo ""
echo "4. Ver resumo dos jobs (últimas 24h):"
echo "   ${YELLOW}SELECT * FROM public.get_cron_job_summary();${NC}"
echo ""
echo -e "${GREEN}🎉 Cron jobs configurados para executar automaticamente!${NC}"
echo ""
