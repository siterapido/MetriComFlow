# Prevenção de Duplicidade - Contas Meta Ads

## Implementação Concluída - 31 de Outubro de 2025

### Problema Resolvido

Anteriormente, era possível que múltiplos usuários/organizações conectassem a mesma conta Meta Ads (identificada pelo `external_id`), causando:
- Conflitos de dados
- Duplicação de campanhas e insights
- Inconsistências no dashboard
- Erros de sincronização

### Solução Implementada

Foi implementado um sistema de prevenção de duplicidade em **3 camadas**:

## 1. Constraint de Banco de Dados (Camada Física)

**Migration**: `20251031000001_prevent_duplicate_ad_accounts.sql`

### Constraint Única
```sql
ALTER TABLE ad_accounts
ADD CONSTRAINT ad_accounts_external_id_key
UNIQUE (external_id);
```

**Benefícios**:
- ✅ Garante unicidade a nível de banco de dados
- ✅ Impossibilita inserção de duplicatas
- ✅ Retorna erro `23505` (unique violation) automaticamente

### Função de Verificação
```sql
CREATE FUNCTION is_ad_account_connected(p_external_id TEXT)
RETURNS TABLE (
  is_connected BOOLEAN,
  connected_by_user_id UUID,
  connected_by_user_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  business_name TEXT
)
```

**Uso**:
```typescript
const { data } = await supabase.rpc('is_ad_account_connected', {
  p_external_id: '1558732224693082'
});

if (data && data.length > 0) {
  // Conta já conectada!
  const account = data[0];
  console.log(`Conectada por ${account.connected_by_user_name}`);
  console.log(`Organização: ${account.organization_name}`);
}
```

## 2. Validação no Hook (Camada Aplicação)

**Arquivo**: `src/hooks/useMetaAuth.ts`

### Função `checkAccountConnected`

Verifica globalmente se uma conta já está conectada **antes** de tentar inserir:

```typescript
const checkAccountConnected = async (externalId: string): Promise<{
  isConnected: boolean;
  connectedByUserName?: string;
  organizationName?: string;
  businessName?: string;
}>
```

### Validação no `addAdAccount`

```typescript
// IMPORTANTE: Verifica GLOBALMENTE (todas organizações)
const connectionCheck = await checkAccountConnected(normalizedId);
if (connectionCheck.isConnected) {
  const { connectedByUserName, organizationName, businessName } = connectionCheck;
  throw new Error(
    `Esta conta Meta "${businessName}" já está conectada por ${connectedByUserName} ` +
    `na organização "${organizationName}". ` +
    `Cada conta Meta só pode ser conectada uma vez no sistema.`
  );
}
```

**Benefícios**:
- ✅ Mensagem de erro amigável para o usuário
- ✅ Informa quem já conectou a conta
- ✅ Impede tentativa de inserção antes de chamar o banco
- ✅ Reduz carga no banco de dados

## 3. Tratamento de Erro (Camada UI)

O erro `23505` do constraint é capturado e exibido ao usuário:

```typescript
if (error.code === '23505') {
  throw new Error('Esta conta publicitária já está conectada.');
}
```

## Fluxo de Validação Completo

```
Usuário tenta conectar conta (external_id: 123456)
  ↓
1. Frontend valida formato (10+ dígitos numéricos)
  ↓
2. Hook chama checkAccountConnected(123456)
  ↓
3. Função RPC consulta: is_ad_account_connected
  ↓
4a. Se CONECTADA → Retorna dados da conexão existente
    ↓
    Lança erro com mensagem detalhada
    ↓
    UI exibe: "Já conectada por [nome] na organização [org]"

4b. Se NÃO CONECTADA → Continua
    ↓
5. Tenta INSERT no banco
  ↓
6a. Se houver race condition → Constraint bloqueia
    ↓
    Erro 23505 capturado
    ↓
    UI exibe: "Esta conta já está conectada"

6b. Se OK → Conta adicionada com sucesso ✅
```

## Como Aplicar a Migration

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/sql/new

2. Cole e execute este SQL:

```sql
-- Step 1: Add unique constraint on external_id
ALTER TABLE ad_accounts
DROP CONSTRAINT IF EXISTS ad_accounts_external_id_key;

ALTER TABLE ad_accounts
ADD CONSTRAINT ad_accounts_external_id_key
UNIQUE (external_id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_ad_accounts_external_id
ON ad_accounts(external_id);

-- Step 3: Add comment
COMMENT ON CONSTRAINT ad_accounts_external_id_key ON ad_accounts IS
'Ensures each Meta ad account (identified by external_id) can only be connected once across all organizations. This prevents duplicate connections and data conflicts.';

-- Step 4: Create verification function
CREATE OR REPLACE FUNCTION is_ad_account_connected(p_external_id TEXT)
RETURNS TABLE (
  is_connected BOOLEAN,
  connected_by_user_id UUID,
  connected_by_user_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_connected,
    p.id as connected_by_user_id,
    p.full_name as connected_by_user_name,
    aa.organization_id,
    o.name as organization_name,
    aa.business_name
  FROM ad_accounts aa
  LEFT JOIN organizations o ON o.id = aa.organization_id
  LEFT JOIN profiles p ON p.id = aa.connected_by
  WHERE aa.external_id = p_external_id
    AND aa.is_active = TRUE
  LIMIT 1;
END;
$$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION is_ad_account_connected TO authenticated;
```

### Opção 2: Via Script

```bash
npx tsx scripts/apply-unique-constraint.ts
```

Este script:
1. Verifica se há duplicatas existentes
2. Se encontrar, pede para removê-las primeiro
3. Gera o SQL completo para aplicação manual

## Verificação de Duplicatas

### Antes de Aplicar o Constraint

```bash
npx tsx scripts/check-ad-accounts.ts
```

Se houver duplicatas, limpe primeiro:

```bash
npx tsx scripts/fix-ad-accounts.ts
```

### Testar a Prevenção

Após aplicar o constraint, teste tentando conectar a mesma conta duas vezes:

1. Conecte uma conta via `/meta-ads-config`
2. Tente conectar a mesma conta novamente
3. Deve exibir erro: "Esta conta Meta já está conectada por [usuário]..."

## Mensagens de Erro

### Para o Usuário Final

✅ **Amigável e informativa**:
```
Esta conta Meta "Marcos de Souza" já está conectada por João Silva
na organização "Empresa ABC".
Cada conta Meta só pode ser conectada uma vez no sistema.
```

### Para Desenvolvedores (Console)

```typescript
console.error('Error adding ad account:', {
  code: '23505',
  message: 'duplicate key value violates unique constraint "ad_accounts_external_id_key"',
  detail: 'Key (external_id)=(1558732224693082) already exists.'
});
```

## Casos de Uso

### ✅ Caso 1: Usuário tenta conectar conta já conectada por outro
- **Ação**: Validação no hook detecta
- **Resultado**: Erro amigável com nome do usuário que conectou
- **UI**: Toast de erro com mensagem clara

### ✅ Caso 2: Race condition (dois usuários simultaneamente)
- **Ação**: Ambos passam pela validação inicial
- **Resultado**: Primeiro INSERT sucede, segundo falha no constraint
- **UI**: Segundo usuário recebe erro genérico de duplicidade

### ✅ Caso 3: Conta desativada e reativada
- **Ação**: Reativar conta existente (não criar nova)
- **Resultado**: `activateAdAccount(accountId)` muda `is_active = true`
- **UI**: Conta aparece novamente na lista ativa

### ❌ Caso 4: Tentar conectar conta inativa de outra org
- **Ação**: Validação detecta conta (mesmo inativa)
- **Resultado**: Erro de duplicidade
- **Solução**: Primeiro usuário deve deletar permanentemente, depois segundo pode conectar

## Arquitetura Multi-Tenant

A prevenção respeita a arquitetura multi-tenant:

```
Sistema Global
  ├─ Organização A
  │   └─ Usuário João
  │       └─ ❌ Não pode conectar conta X (já conectada na Org B)
  │
  └─ Organização B
      └─ Usuário Maria
          └─ ✅ Conectou conta X (primeira conexão)
```

**Importante**: O constraint é **global** (não por organização), pois:
1. Evita conflitos de dados da Meta API
2. Previne duplicação de campanhas e insights
3. Garante consistência nos relatórios

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `check-ad-accounts.ts` | Verificar contas existentes e duplicatas |
| `fix-ad-accounts.ts` | Limpar contas antigas e duplicatas |
| `apply-unique-constraint.ts` | Gerar SQL para aplicar constraint |
| `fix-and-migrate.ts` | Migrar conexão Meta entre usuários |

## Rollback

Se precisar reverter a constraint:

```sql
-- Remover constraint
ALTER TABLE ad_accounts
DROP CONSTRAINT ad_accounts_external_id_key;

-- Remover função
DROP FUNCTION IF EXISTS is_ad_account_connected;

-- Remover índice
DROP INDEX IF EXISTS idx_ad_accounts_external_id;
```

⚠️ **Atenção**: Após rollback, duplicatas voltarão a ser possíveis!

## Testes Recomendados

1. ✅ Conectar conta pela primeira vez → Deve funcionar
2. ✅ Tentar reconectar mesma conta → Deve bloquear
3. ✅ Desativar e reativar conta → Deve funcionar
4. ✅ Usuário diferente tentar conectar → Deve bloquear
5. ✅ Mensagem de erro exibe info correta → Deve mostrar quem conectou

---

**Status**: ✅ Implementação completa
**Data**: 31 de Outubro de 2025
**Autor**: Claude Code
**Versão**: 1.0
