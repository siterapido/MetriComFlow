# Troubleshooting: Plano Não Aparece Após Configuração

## 🔍 Problema

Após criar uma subscription no banco de dados, a página `/planos` ainda mostra "Nenhum plano ativo".

## ✅ Dados Confirmados no Banco

**Email:** marcosalexandre@insigtfy.com.br

- ✅ **user_type:** `owner`
- ✅ **Organização:** "Marcos Alexandre's Organization" (ID: `a276fdc7-1dca-43b8-8d01-fff1c1790e9a`)
- ✅ **Membership:** Role `owner`, ativo
- ✅ **Subscription:** Plano Pro, status `active`

---

## 🎯 Causa Raiz

O **JWT token** do usuário no navegador foi criado **antes** das alterações no banco de dados. O token ainda contém as permissões antigas (`user_type: sales`, sem organização), e as **RLS policies** estão bloqueando o acesso aos dados novos.

---

## 🔧 Solução: Logout e Login

### Passos:

1. **Fazer Logout** na aplicação
   - Clicar no menu de usuário → Sair
   - Ou acessar diretamente a página de login

2. **Limpar Cache do Navegador** (opcional, mas recomendado)
   - Chrome/Edge: `Ctrl+Shift+Delete` → Limpar dados de navegação
   - Ou abrir em aba anônima: `Ctrl+Shift+N`

3. **Fazer Login Novamente**
   - Email: `marcosalexandre@insigtfy.com.br`
   - Senha: [senha do usuário]

4. **Verificar Resultado**
   - Acessar `/planos`
   - Deve mostrar: "Plano Atual: Pro"
   - Status: "Assinatura Ativa ✓"

---

## 🔐 Por Que Isso Acontece?

### JWT Token e Permissões

Quando o usuário faz login, o Supabase Auth cria um **JWT token** contendo:

```json
{
  "sub": "702b1490-970b-4830-9ef8-1cab6ba66f53",
  "email": "marcosalexandre@insigtfy.com.br",
  "user_metadata": {
    "user_type": "sales"  // ❌ VALOR ANTIGO
  }
}
```

As **RLS policies** usam `auth.uid()` para filtrar dados:

```sql
-- Policy: Members can view organization subscription
EXISTS (
  SELECT 1 FROM organization_memberships om
  WHERE om.organization_id = organization_subscriptions.organization_id
    AND om.profile_id = auth.uid()  -- ❌ Token antigo não tem acesso
    AND om.is_active = TRUE
)
```

### Após Logout/Login

Novo JWT token é criado com permissões atualizadas:

```json
{
  "sub": "702b1490-970b-4830-9ef8-1cab6ba66f53",
  "email": "marcosalexandre@insigtfy.com.br",
  "user_metadata": {
    "user_type": "owner"  // ✅ VALOR ATUALIZADO
  }
}
```

Agora `auth.uid()` retorna o ID correto e a RLS policy permite acesso.

---

## 🧪 Teste Manual (Opcional)

Se quiser verificar antes de fazer logout:

1. Abrir **DevTools** → Console
2. Executar:

```javascript
// Verificar token atual
const session = await window.supabase.auth.getSession();
console.log('Current token:', session.data.session?.access_token);

// Verificar organizações visíveis
const { data: orgs } = await window.supabase
  .from('organizations')
  .select('*');
console.log('Organizations:', orgs);

// Verificar subscriptions visíveis
const { data: subs } = await window.supabase
  .from('organization_subscriptions')
  .select('*, subscription_plans(*)');
console.log('Subscriptions:', subs);
```

Se `orgs` ou `subs` estiverem vazios → precisa fazer logout/login.

---

## 📊 Verificação Pós-Login

Após fazer login novamente, a página `/planos` deve mostrar:

### Header
- **Badge:** "Plano Atual: Pro"
- Status: "Assinatura Ativa ✓"
- Próxima cobrança: [data]

### Current Usage Stats
- **Plano Atual:** Pro
- **Contas de Anúncio:** 0 / 20
- **Usuários Ativos:** 1 / 10

### Plans Grid
- Card "Pro" com badge "Plano Atual"
- Botão "Plano Atual" (desabilitado)
- Outros planos com botão "Contratar Plano"

---

## 🚨 Se Ainda Não Funcionar

Se após logout/login ainda não aparecer:

### 1. Verificar Dados no Banco

Execute no Supabase SQL Editor:

```sql
SELECT
  p.email,
  p.user_type,
  o.name as org_name,
  om.role,
  sp.name as plan_name,
  os.status
FROM profiles p
LEFT JOIN organization_memberships om ON om.profile_id = p.id AND om.is_active = TRUE
LEFT JOIN organizations o ON o.id = om.organization_id
LEFT JOIN organization_subscriptions os ON os.organization_id = o.id
LEFT JOIN subscription_plans sp ON sp.id = os.plan_id
WHERE p.email = 'marcosalexandre@insigtfy.com.br';
```

**Esperado:**
- `user_type`: `owner`
- `org_name`: "Marcos Alexandre's Organization"
- `role`: `owner`
- `plan_name`: `Pro`
- `status`: `active`

### 2. Verificar RLS Policies

```sql
-- Verificar se a policy permite SELECT
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'organization_subscriptions'
  AND cmd = 'SELECT';
```

### 3. Verificar Console do Navegador

Abrir DevTools → Network → filtrar "organization_subscriptions"
- Verificar se a request retorna 200 OK
- Verificar payload da resposta

---

## 📝 Scripts Disponíveis

### Diagnóstico Completo

```bash
npx tsx scripts/diagnose-subscription-issue.ts
```

**Nota:** Precisa atualizar a senha do usuário no script.

### Re-criar Subscription (se necessário)

```bash
npx tsx scripts/update-user-to-owner-pro.ts
```

---

## ✅ Resumo

**Problema:** JWT token desatualizado após alterações no banco
**Solução:** Logout + Login
**Resultado Esperado:** Plano Pro visível em `/planos`

**Tempo Estimado:** < 1 minuto

---

**Última Atualização:** 2025-01-28
