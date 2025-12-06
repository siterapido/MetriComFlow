#!/bin/bash

# ===================================
# Importar Backup Local (.sql) para Novo Banco
# ===================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   IMPORTAR BACKUP LOCAL PARA NOVO BANCO       ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Carregar config
if [ ! -f .env.migration ]; then
    echo -e "${RED}Erro: .env.migration não encontrado.${NC}"
    exit 1
fi
source .env.migration

# Verificar conexão com destino
echo -e "${YELLOW}Testando conexão com banco DESTINO...${NC}"
if ! psql "$TARGET_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro ao conectar no novo banco.${NC}"
    echo "Verifique a senha em .env.migration (TARGET_DB_PASSWORD)"
    exit 1
fi
echo -e "${GREEN}✅ Conectado ao novo banco.${NC}"
echo ""

# Listar arquivos SQL disponíveis
echo -e "${YELLOW}Arquivos .sql encontrados na pasta backup/:${NC}"
ls -1 backup/*.sql 2>/dev/null || echo "Nenhum arquivo .sql encontrado."
echo ""

echo "Digite o nome do arquivo para importar (ex: backup/meu-backup.sql):"
read -e -p "> " SQL_FILE

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Arquivo não encontrado!${NC}"
    exit 1
fi

echo ""
echo -e "${RED}⚠️  ATENÇÃO: Isso vai sobrescrever o banco destino!${NC}"
echo -e "Arquivo: $SQL_FILE"
echo -e "Destino: $TARGET_DB_HOST"
echo ""
read -p "Tem certeza? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Importando... (isso pode demorar)${NC}"

# Importar
psql "$TARGET_DB_URL" < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Importação concluída com sucesso!${NC}"
    
    echo ""
    echo -e "${YELLOW}Agora execute a verificação:${NC}"
    echo "./5-verify-migration.sh"
else
    echo ""
    echo -e "${RED}❌ Erro na importação.${NC}"
fi
