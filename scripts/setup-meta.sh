#!/bin/bash

# Script de configuração do Meta Ads Integration
# Executa todos os passos necessários para configurar a integração

echo "🚀 Meta Ads Integration Setup"
echo "============================"
echo ""

echo "📋 PASSO 1: Listar usuários do Supabase"
echo "----------------------------------------"
npx tsx scripts/list-users.ts
echo ""

echo "📝 PASSO 2: Aplicar migração no Supabase"
echo "----------------------------------------"
echo "⚠️  IMPORTANTE: Você precisa aplicar a migração manualmente!"
echo ""
echo "1. Acesse: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/sql/new"
echo "2. Abra o arquivo: INSTRUCOES_MIGRACAO_META.md"
echo "3. Copie e cole o SQL no Supabase SQL Editor"
echo "4. Execute (Run)"
echo ""
read -p "Pressione ENTER após aplicar a migração no Supabase Dashboard..."
echo ""

echo "🧪 PASSO 3: Testar token e salvar no banco"
echo "----------------------------------------"
echo "Executando teste do token..."
npx tsx scripts/test-meta-token.ts marckexpert1@gmail.com
echo ""

if [ $? -eq 0 ]; then
  echo "✅ Setup concluído com sucesso!"
  echo ""
  echo "🎉 Próximos passos:"
  echo "   1. Inicie a aplicação: npm run dev"
  echo "   2. Acesse: http://localhost:8080/meta-ads-config"
  echo "   3. Você verá suas 3 contas Meta conectadas"
  echo ""
else
  echo "❌ Erro no setup. Verifique os logs acima."
  exit 1
fi
