# Correção do Sistema Meta Ads - 31 de Outubro de 2025

## Problema Identificado

O erro "Esta conta publicitária já está conectada" ocorria porque:

1. **Conflito de Usuários**: As contas Meta estavam vinculadas ao usuário `testefinal2@gmail.com`, mas você estava tentando conectá-las com outro usuário
2. **Dados Órfãos**: Havia 3 contas de anúncios no banco vinculadas a uma organização diferente da atual
3. **Falta de Organização Ativa**: O usuário `marcos@insightfy.com.br` não tinha organização ativa configurada

## Ações Realizadas

### 1. Limpeza de Dados Antigos ✅
- Removidas **3 contas de anúncios antigas**:
  - Marcos de Souza (199415206844304)
  - CA - SITE RAPIDO (1558732224693082)
  - Smartcell (1398847601234023)
- Removidas campanhas órfãs (se existiam)
- Removidos insights órfãos (se existiam)

### 2. Criação de Organização ✅
- Criada organização: **"marcos Organização"**
- ID: `c3b3defe-1995-4064-a1da-fb93d4e53079`
- Membership ativo criado para o usuário

### 3. Migração da Conexão Meta ✅
- Conexão Meta migrada de `testefinal2@gmail.com` para `marcos@insightfy.com.br`
- Token válido até: **30/12/2025**
- Meta User: Marcos de Souza

## Estado Atual do Banco de Dados

```
✅ Usuário: marcos@insightfy.com.br
   - ID: 1c764a66-f23a-46ea-9aca-29f010253f3e
   - Organização: marcos Organização
   - Role: owner

✅ Conexão Meta: Ativa
   - Meta User: Marcos de Souza
   - Token expira: 2025-12-30

⚠️  Contas de Anúncios: 0 (aguardando conexão)
⚠️  Campanhas: 0 (serão criadas após conexão)
⚠️  Insights: 0 (serão sincronizados após campanhas)
```

## Próximos Passos (IMPORTANTE!)

### 1. Login com o Usuário Correto
```
Email: marcos@insightfy.com.br
```

### 2. Conectar Contas de Anúncios

1. Acesse: [/meta-ads-config](https://www.insightfy.com.br/meta-ads-config)
2. Clique em **"Conectar Contas"** ou **"Adicionar Conta"**
3. Selecione as 3 contas disponíveis:
   - ✓ Marcos de Souza (199415206844304)
   - ✓ CA - SITE RAPIDO (1558732224693082)
   - ✓ Smartcell (1398847601234023)

### 3. Sincronizar Dados Históricos

Após conectar as contas, execute a sincronização de insights:

```bash
# Via Edge Function (recomendado)
npx supabase functions invoke sync-daily-insights \
  --data '{
    "since": "2025-01-01",
    "until": "2025-10-31",
    "maxDaysPerChunk": 30,
    "logResponseSample": true
  }'

# Ou via curl
curl -X POST https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-daily-insights \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2025-01-01",
    "until": "2025-10-31",
    "maxDaysPerChunk": 30
  }'
```

### 4. Verificar Dashboard

Após a sincronização, os dados aparecerão em:
- `/dashboard` - KPIs gerais
- `/meta-ads-config` - Métricas detalhadas das campanhas

## Scripts Criados

Os seguintes scripts foram criados na pasta `/scripts` para diagnóstico e correção:

1. **check-ad-accounts.ts** - Verificar estado das contas
2. **fix-ad-accounts.ts** - Limpar contas antigas
3. **check-user-org.ts** - Verificar organizações do usuário
4. **find-active-user.ts** - Encontrar usuário com conexão Meta
5. **setup-user-properly.ts** - Guia de configuração
6. **migrate-meta-connection.ts** - Migração interativa
7. **fix-and-migrate.ts** - **Correção automática (usado)**

## Arquitetura Multi-Tenancy

O sistema agora está configurado corretamente com:

```
Usuário (marcos@insightfy.com.br)
  └─ Organização (marcos Organização)
      ├─ Conexão Meta (Marcos de Souza)
      └─ Contas de Anúncios (a serem conectadas)
          └─ Campanhas (serão sincronizadas)
              └─ Insights (métricas diárias)
```

## Problemas Resolvidos

✅ Erro "Esta conta publicitária já está conectada"
✅ Conflito de organização
✅ Usuário sem organização ativa
✅ Dados órfãos no banco
✅ Migração de conexão Meta entre usuários

## Notas Importantes

1. **Token Meta válido até 30/12/2025** - Após essa data, será necessário reconectar via OAuth
2. **Sincronização Manual** - A sincronização de insights históricos deve ser feita manualmente via Edge Function
3. **Multi-Tenancy** - Todas as queries futuras devem filtrar por `organization_id`
4. **RLS Ativo** - As políticas de segurança garantem isolamento entre organizações

## Verificação Final

Execute este comando para verificar se tudo está correto:

```bash
npx tsx scripts/check-ad-accounts.ts
```

Deve retornar:
- ✅ Contas de anúncios conectadas (após você conectá-las na UI)
- ✅ Campanhas sincronizadas (após conexão)
- ✅ Insights disponíveis (após sincronização)

---

**Data**: 31 de Outubro de 2025
**Status**: ✅ Correção concluída - Aguardando conexão das contas na UI
