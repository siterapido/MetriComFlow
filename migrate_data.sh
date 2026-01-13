#!/bin/bash

# Script de migração de dados entre projetos Supabase
# Origem: kyysmixnhdqrxynxjbwk
# Destino: fjoaliipjfcnokermkhy

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Iniciando migração de dados...${NC}"

# Configurações do projeto ORIGEM (antigo)
OLD_PROJECT_URL="https://kyysmixnhdqrxynxjbwk.supabase.co"
OLD_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODU4NDMsImV4cCI6MjA3OTM2MTg0M30.wjYCzJAZyW71CjgcJKlu6ZPCwyIJZSETvBeHNJ1WxG0"

# Configurações do projeto DESTINO (novo)
NEW_PROJECT_URL="https://fjoaliipjfcnokermkhy.supabase.co"
NEW_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw"

# Tabelas a serem migradas (em ordem de dependência)
TABLES=(
  "organizations"
  "profiles"
  "organization_memberships"
  "leads"
  "lead_activity"
)

# Função para exportar dados de uma tabela
export_table() {
  local table=$1
  echo -e "${YELLOW}📦 Exportando tabela: $table${NC}"
  
  curl -s "${OLD_PROJECT_URL}/rest/v1/${table}?select=*" \
    -H "apikey: ${OLD_ANON_KEY}" \
    -H "Authorization: Bearer ${OLD_ANON_KEY}" \
    > "migration_${table}.json"
  
  local count=$(cat "migration_${table}.json" | jq '. | length' 2>/dev/null || echo "0")
  echo -e "${GREEN}✅ Exportados ${count} registros de ${table}${NC}"
}

# Função para importar dados de uma tabela
import_table() {
  local table=$1
  echo -e "${YELLOW}📥 Importando para tabela: $table${NC}"
  
  if [ ! -f "migration_${table}.json" ]; then
    echo -e "${RED}❌ Arquivo migration_${table}.json não encontrado${NC}"
    return 1
  fi
  
  local data=$(cat "migration_${table}.json")
  
  if [ "$data" = "[]" ] || [ -z "$data" ]; then
    echo -e "${YELLOW}⚠️  Nenhum dado para importar em ${table}${NC}"
    return 0
  fi
  
  curl -X POST "${NEW_PROJECT_URL}/rest/v1/${table}" \
    -H "apikey: ${NEW_SERVICE_KEY}" \
    -H "Authorization: Bearer ${NEW_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=ignore-duplicates" \
    -d "$data"
  
  echo -e "${GREEN}✅ Dados importados para ${table}${NC}"
}

# Criar diretório para backup
mkdir -p migration_backup
cd migration_backup

# Exportar todas as tabelas
echo -e "${YELLOW}=== FASE 1: EXPORTAÇÃO ===${NC}"
for table in "${TABLES[@]}"; do
  export_table "$table"
done

echo ""
echo -e "${YELLOW}=== FASE 2: IMPORTAÇÃO ===${NC}"

# Importar todas as tabelas
for table in "${TABLES[@]}"; do
  import_table "$table"
  sleep 1  # Pequeno delay entre importações
done

echo ""
echo -e "${GREEN}✅ Migração concluída!${NC}"
echo -e "${YELLOW}📁 Arquivos de backup salvos em: migration_backup/${NC}"
