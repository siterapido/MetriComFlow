#!/bin/bash

# ============================================================================
# Script: Sincronização Manual de Métricas Meta Ads
# ============================================================================
# Este script sincroniza:
# 1. Ad Sets (conjuntos de anúncios)
# 2. Ads (criativos)
# 3. Ad Set Insights (métricas por conjunto)
# 4. Ad Insights (métricas por criativo)
#
# Uso:
#   ./scripts/sync-meta-ads-metrics.sh
#   ./scripts/sync-meta-ads-metrics.sh --dry-run
#   ./scripts/sync-meta-ads-metrics.sh --since 2025-01-01 --until 2025-01-31
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DRY_RUN=false
# Usar sintaxe compatível com Mac/Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
  SINCE=$(date -u -v-7d +%Y-%m-%d)
  UNTIL=$(date -u +%Y-%m-%d)
else
  SINCE=$(date -d "7 days ago" +%Y-%m-%d)
  UNTIL=$(date +%Y-%m-%d)
fi
PROJECT_URL="${VITE_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --since)
      SINCE="$2"
      shift 2
      ;;
    --until)
      UNTIL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validar variáveis de ambiente
if [ -z "$PROJECT_URL" ]; then
  echo -e "${RED}❌ Erro: VITE_SUPABASE_URL não configurada${NC}"
  echo "Configure em .env: VITE_SUPABASE_URL=https://seu-projeto.supabase.co"
  exit 1
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada${NC}"
  echo "Configure em .env: SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key"
  exit 1
fi

echo -e "${BLUE}==============================================================${NC}"
echo -e "${BLUE}📊 SINCRONIZAÇÃO DE MÉTRICAS META ADS${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo "Projeto: $PROJECT_URL"
echo "Período: $SINCE até $UNTIL"
echo "Modo: $([ "$DRY_RUN" = true ] && echo 'SIMULAÇÃO' || echo 'EXECUÇÃO')"
echo ""

# Função para invocar Edge Function
invoke_function() {
  local func_name=$1
  local payload=$2
  local description=$3

  echo -e "${YELLOW}📡 $description...${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN] Seria chamada:${NC}"
    echo "  Função: $func_name"
    echo "  Payload: $payload"
    echo ""
    return 0
  fi

  local response=$(curl -s -X POST \
    "${PROJECT_URL}/functions/v1/${func_name}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${PROJECT_URL}/functions/v1/${func_name}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ Sucesso (HTTP $http_code)${NC}"
    echo "   Resposta: $(echo $response | jq -r '.message // .success // .' 2>/dev/null || echo $response)"
    echo ""
    return 0
  else
    echo -e "${RED}❌ Erro (HTTP $http_code)${NC}"
    echo "   Resposta: $response"
    echo ""
    return 1
  fi
}

# Step 1: Sincronizar Ad Sets
invoke_function "sync-ad-sets" '{}' "Step 1/4: Sincronizando Conjuntos de Anúncios (Ad Sets)"

# Step 2: Sincronizar Ads (Criativos)
invoke_function "sync-ads" '{}' "Step 2/4: Sincronizando Criativos (Ads)"

# Step 3: Sincronizar Ad Set Insights
payload_adset_insights="{\"since\":\"${SINCE}\",\"until\":\"${UNTIL}\",\"maxDaysPerChunk\":30}"
invoke_function "sync-adset-insights" "$payload_adset_insights" "Step 3/4: Sincronizando Métricas por Conjunto (${SINCE} a ${UNTIL})"

# Step 4: Sincronizar Ad Insights
payload_ad_insights="{\"since\":\"${SINCE}\",\"until\":\"${UNTIL}\",\"maxDaysPerChunk\":30}"
invoke_function "sync-ad-insights" "$payload_ad_insights" "Step 4/4: Sincronizando Métricas por Criativo (${SINCE} a ${UNTIL})"

echo -e "${BLUE}==============================================================${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${GREEN}✅ Simulação concluída! Execute sem --dry-run para sincronizar.${NC}"
else
  echo -e "${GREEN}✅ Sincronização concluída com sucesso!${NC}"
fi
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo "📍 Próximos passos:"
echo "   1. Acesse: http://localhost:8082/metricas"
echo "   2. Verifique os dados sincronizados nas tabs: Campanhas, Conjuntos, Criativos"
echo ""
