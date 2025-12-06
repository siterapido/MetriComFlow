#!/bin/bash

# ===================================
# Aplicar Migrações Locais no Novo Banco
# ===================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   APLICAR MIGRAÇÕES NO NOVO BANCO             ${NC}"
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

# Diretório de migrações
MIGRATIONS_DIR="../../supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Diretório de migrações não encontrado: $MIGRATIONS_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📂 Lendo migrações de: $MIGRATIONS_DIR${NC}"
echo ""

# Listar arquivos ordenados
FILES=$(ls "$MIGRATIONS_DIR"/*.sql | sort)

if [ -z "$FILES" ]; then
    echo -e "${RED}Nenhuma migração encontrada.${NC}"
    exit 1
fi

echo "Arquivos encontrados:"
ls "$MIGRATIONS_DIR"/*.sql | sort | awk -F/ '{print "  - " $NF}'
echo ""

echo -e "${RED}⚠️  ATENÇÃO: Isso vai aplicar todas as migrações no banco destino!${NC}"
echo -e "Destino: $TARGET_DB_HOST"
echo ""
read -p "Deseja continuar? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Aplicando migrações...${NC}"

COUNT=0
SUCCESS=0
ERRORS=0

for file in $FILES; do
    FILENAME=$(basename "$file")
    echo -n "Aplicando $FILENAME... "
    
    # Capturar erro, se houver
    OUTPUT=$(psql "$TARGET_DB_URL" -f "$file" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}OK${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}ERRO${NC}"
        echo "$OUTPUT"
        ERRORS=$((ERRORS + 1))
        
        # Perguntar se continua em caso de erro
        read -p "Ocorreu um erro. Deseja continuar com o próximo arquivo? (y/n): " CONT
        if [ "$CONT" != "y" ]; then
            break
        fi
    fi
    COUNT=$((COUNT + 1))
done

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "Resumo:"
echo -e "${GREEN}✅ Sucesso: $SUCCESS${NC}"
echo -e "${RED}❌ Erros: $ERRORS${NC}"
echo -e "${BLUE}================================================${NC}"

if [ $ERRORS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Estrutura do banco criada com sucesso!${NC}"
    echo -e "${YELLOW}Não esqueça de atualizar o .env do projeto:${NC}"
    echo "./6-update-env.sh"
fi
