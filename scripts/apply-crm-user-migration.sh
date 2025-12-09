#!/bin/bash

# Script para aplicar a migration do novo tipo de usuário CRM
# Este script aplica a migration 20251209000000_add_crm_user_type.sql

echo "🚀 Aplicando migration: Novo tipo de usuário CRM"
echo "================================================"
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Erro: Supabase CLI não está instalado"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo "📋 Migration: 20251209000000_add_crm_user_type.sql"
echo ""
echo "Esta migration irá:"
echo "  ✓ Adicionar novo tipo de usuário 'crm_user'"
echo "  ✓ Atualizar função has_crm_access()"
echo "  ✓ Criar função has_forms_access()"
echo "  ✓ Atualizar políticas RLS para formulários"
echo ""

read -p "Deseja continuar? (s/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada"
    exit 1
fi

echo ""
echo "🔄 Aplicando migration..."
echo ""

# Aplicar migration
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration aplicada com sucesso!"
    echo ""
    echo "📝 Próximos passos:"
    echo "  1. Acesse a página de Gestão de Equipe"
    echo "  2. Crie um novo usuário"
    echo "  3. Selecione o tipo 'Usuário CRM'"
    echo "  4. O usuário terá acesso apenas ao CRM, sem formulários"
    echo ""
else
    echo ""
    echo "❌ Erro ao aplicar migration"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi
