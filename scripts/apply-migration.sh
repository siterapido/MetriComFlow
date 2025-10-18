#!/bin/bash

# Script para aplicar a migration 006_mvp_enhancements.sql
# Este script aplica a migration que adiciona suporte completo para Meta Ads

set -e  # Exit on error

echo "================================================"
echo "  Aplicando Migration 006: MVP Enhancements"
echo "================================================"
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Erro: Supabase CLI não está instalado"
    echo "   Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

echo "✅ Diretório correto detectado"
echo ""

# Verificar se a migration existe
MIGRATION_FILE="supabase/migrations/006_mvp_enhancements.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Erro: Migration não encontrada: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration encontrada: $MIGRATION_FILE"
echo ""

# Perguntar ao usuário se deseja continuar
echo "Esta migration irá:"
echo "  - Atualizar o enum de status dos leads"
echo "  - Adicionar campos source, campaign_id, external_lead_id aos leads"
echo "  - Criar tabela campaign_daily_insights"
echo "  - Criar views business_kpis e campaign_financials"
echo "  - Adicionar triggers para datas de fechamento"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada pelo usuário"
    exit 0
fi

echo ""
echo "🔄 Aplicando migration no banco de dados remoto..."
echo ""

# Aplicar migration
npx supabase db push

echo ""
echo "✅ Migration aplicada com sucesso!"
echo ""

# Atualizar tipos TypeScript
echo "🔄 Atualizando tipos TypeScript..."
echo ""

npx supabase gen types typescript --project-id $(grep SUPABASE_PROJECT_ID .env | cut -d '=' -f2) > src/lib/database.types.ts

echo ""
echo "✅ Tipos TypeScript atualizados!"
echo ""

echo "================================================"
echo "  ✅ Migration Concluída com Sucesso!"
echo "================================================"
echo ""
echo "Próximos passos:"
echo "  1. Verifique se as views foram criadas corretamente"
echo "  2. Teste a criação de leads com diferentes origens"
echo "  3. Verifique os dados de Meta Ads na página /metrics"
echo ""
