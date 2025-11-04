# QUICK REFERENCE - SYSTEM DE CONVITES

## Arquivos Críticos e Localizações de Issues

### 1. InviteMemberDialog.tsx
**Arquivo**: `/src/components/team/InviteMemberDialog.tsx`

| Issue | Linhas | Problema | Ação |
|-------|--------|----------|------|
| #2 | 27-30 | Schema sem campo `role` | Adicionar select para role |
| #3 | 170-180 | Input password sem validação | Adicionar password strength check |

**Code Snippet - Issue #2**:
```typescript
// ATUAL (linhas 27-30):
const inviteSchema = z.object({
  email: z.string().email("Informe um email válido"),
  user_type: z.enum(["sales", "traffic_manager", "owner"]),
});

// NECESSÁRIO:
const inviteSchema = z.object({
  email: z.string().email("Informe um email válido"),
  role: z.enum(["owner", "admin", "manager", "member"]),  // ADICIONAR
  user_type: z.enum(["sales", "traffic_manager", "owner"]),
});
```

---

### 2. send-team-invitation (Edge Function)
**Arquivo**: `/supabase/functions/send-team-invitation/index.ts`

| Issue | Linhas | Problema | Ação |
|-------|--------|----------|------|
| #5 | 210-212 | Apenas owner pode enviar | Alterar RLS policy |
| #6 | 214-225 | Rate limit por org, não usuario | Adicionar filtered by user_id |
| #14 | 211, 224, 243, 256 | Msgs genéricas | Melhorar mensagens |
| #15 | 290-300 | Retorna sucesso mesmo com falha de email | Retornar erro se email falhar |

**Code Snippet - Issue #15**:
```typescript
// ATUAL (linhas 290-300):
try {
  await sendEmailInvitation({...});
  console.log("✅ Convite enviado por email");
} catch (emailError) {
  console.error("Falha no envio do email, mantendo convite criado:", emailError);
  // ⚠️ NÃO LANÇA ERRO - CONTINUA COMO SUCESSO
}

// NECESSÁRIO:
try {
  await sendEmailInvitation({...});
} catch (emailError) {
  // ❌ LANÇAR ERRO:
  throw new Error("Falha no envio do email. Verifique a configuração do Resend.");
}
```

**Code Snippet - Issue #5**:
```sql
-- ATUAL (linhas 219-256):
CREATE POLICY "Owners can manage organization invitations"
  ON team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = team_invitations.organization_id
        AND owner_id = auth.uid()  -- ❌ SÓ OWNER
    )
  );

-- NECESSÁRIO:
CREATE POLICY "Owners and admins can manage organization invitations"
  ON team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = team_invitations.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')  -- ✅ OWNER + ADMIN
        AND om.is_active = TRUE
    )
  );
```

---

### 3. accept-invitation (Edge Function)
**Arquivo**: `/supabase/functions/accept-invitation/index.ts`

| Issue | Linhas | Problema | Ação |
|-------|--------|----------|------|
| #7 | 103-110 | email_confirm: true sem verificação | Remover email_confirm ou requer verificação |
| #8 | 69-207 | 5 operações sem transação | Adicionar error handling + compensação |
| #9 | 190-207 | Sem rollback se falhar | Wrappear em try/catch |
| #3 | 93-99 | Sem validação de senha | Adicionar password validation |

**Code Snippet - Issue #7**:
```typescript
// ATUAL (linhas 103-110):
const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
  email: invitation.email,
  password,
  email_confirm: true,  // ❌ SEM VERIFICAÇÃO
  user_metadata: { full_name },
});

// NECESSÁRIO - OPÇÃO 1: Não marcar como confirmado
const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
  email: invitation.email,
  password,
  // email_confirm: true,  // REMOVER ESTA LINHA
  user_metadata: { full_name },
});

// OPÇÃO 2: Adicionar verificação extra (requer Supabase Admin)
const { data: newUser } = await supabase.auth.admin.createUser({...});
// Requer confirmação via email enviado pelo Supabase
```

**Code Snippet - Issue #8 (Estrutura com erro handling)**:
```typescript
// ATUAL: Operações sequenciais sem proteção
const { data: newUser } = await supabase.auth.admin.createUser({...});
const profileResult = await supabase.from("profiles").insert({...});
const membershipResult = await supabase.from("organization_memberships").insert({...});

// NECESSÁRIO: Transação com rollback
const operationLog = [];

try {
  // 1. Criar usuario
  const { data: newUser, error: userError } = await supabase.auth.admin.createUser({...});
  if (userError) throw new Error("User creation failed");
  operationLog.push({ step: 1, userId: newUser.user.id });

  // 2. Criar profile
  const { error: profileError } = await supabase.from("profiles").insert({...});
  if (profileError) throw new Error("Profile creation failed");
  operationLog.push({ step: 2 });

  // 3. Criar membership
  const { error: memberError } = await supabase.from("organization_memberships").insert({...});
  if (memberError) throw new Error("Membership creation failed");
  operationLog.push({ step: 3 });

  // 4. Atualizar convite
  const { error: invError } = await supabase.from("team_invitations").update({...});
  if (invError) throw new Error("Invitation update failed");
  operationLog.push({ step: 4 });

  // 5. Atualizar org ativa
  const { error: orgError } = await supabase.from("profiles").update({...});
  if (orgError) throw new Error("Active org update failed");
  operationLog.push({ step: 5 });

  // Se chegou aqui, todas operações OK
  return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { status: 200 });

} catch (error) {
  // COMPENSAÇÃO: Reverter o que foi criado
  console.error("Failed at step:", error.message);
  
  // Se usuario foi criado (step 1), deletar
  if (operationLog.some(log => log.step === 1)) {
    const userId = operationLog.find(log => log.step === 1)?.userId;
    // Deletar usuario (requer admin)
    await supabase.auth.admin.deleteUser(userId);
  }
  
  throw error;
}
```

---

### 4. AcceptInvitation.tsx
**Arquivo**: `/src/pages/AcceptInvitation.tsx`

| Issue | Linhas | Problema | Ação |
|-------|--------|----------|------|
| #4 | 86-129 | handleAccept sem validação early | Validar invitation antes de chamar função |

**Code Snippet - Issue #4**:
```typescript
// ATUAL (linha 86-90):
const handleAccept = async () => {
  if (!token) {  // Validação tardia
    setError("Token inválido");
    return;
  }

// NECESSÁRIO: Validação antecipada
const handleAccept = async () => {
  // Validar logo:
  if (!token || !invitation) {
    setError("Token inválido ou convite não encontrado");
    return;
  }

  // Validar se expirou
  if (new Date(invitation.expires_at) < new Date()) {
    setError("Este convite já expirou");
    return;
  }

  // Continuar apenas se tudo ok
  setAccepting(true);
  // ...
```

---

### 5. 20251023_team_invitations_system.sql
**Arquivo**: `/supabase/migrations/20251023_team_invitations_system.sql`

| Issue | Linhas | Problema | Ação |
|-------|--------|----------|------|
| #5 | 219-256 | RLS policy muito restritiva | Modificar para permitir admin |
| #10 | 209-211 | Índice UNIQUE parcial | Adicionar constraint UNIQUE fullstack |
| #12 | 263-277 | Trigger só roda em UPDATE/INSERT | Implementar cron job |

**Code Snippet - Issue #12 (Adicionar cron job)**:
```sql
-- ADICIONAR NOVA MIGRATION:
-- Nome: 20251211000002_cleanup_expired_invitations.sql

-- Habilitar pg_cron extension (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar função de cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  DELETE FROM public.team_invitations
  WHERE status IN ('expired', 'revoked')
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar job para rodar diariamente às 2 AM
SELECT cron.schedule(
  'cleanup-expired-team-invitations',
  '0 2 * * *',
  'SELECT public.cleanup_expired_invitations()'
);
```

---

## Summary: Linhas Específicas por Issue

```
#1  Role vs User Type confuso
    - InviteMemberDialog.tsx: 29, 58-64
    - send-team-invitation/index.ts: 25-26, 157-158

#2  Dialog sem campo Role
    - InviteMemberDialog.tsx: 27-30, 135-161

#3  Sem validação de senha
    - AcceptInvitation.tsx: 170-180
    - accept-invitation/index.ts: 93-99

#4  Token validation no frontend
    - AcceptInvitation.tsx: 86-129

#5  RLS muito restritiva
    - 20251023_team_invitations_system.sql: 219-256
    - send-team-invitation/index.ts: 210-212

#6  Rate limit por org, não usuario
    - send-team-invitation/index.ts: 214-225

#7  Sem confirmação de email
    - accept-invitation/index.ts: 103-110

#8  Sincronização de dados
    - accept-invitation/index.ts: 69-207

#9  Sem compensação para falhas
    - accept-invitation/index.ts: 190-207

#10 Sem UNIQUE email+org
    - 20251023_team_invitations_system.sql: 209-211

#11 Sem auditoria
    - Nenhum arquivo específico (implementar nova tabela)

#12 Expiração manual
    - 20251023_team_invitations_system.sql: 263-277

#13 Sem cleanup automático
    - Nenhuma migration com cron (implementar)

#14 Mensagens genéricas
    - send-team-invitation/index.ts: 211, 224, 243, 256

#15 Sem feedback de email falho
    - send-team-invitation/index.ts: 290-300
```

---

## Resumo: Arquivos Para Modificar

| Prioridade | Arquivo | Issues | Ação |
|-----------|---------|--------|------|
| 🔴 CRÍTICA | 20251023_team_invitations_system.sql | #5 | Modificar RLS policy |
| 🔴 CRÍTICA | accept-invitation/index.ts | #7, #8 | Email confirm + transação |
| 🟠 ALTA | InviteMemberDialog.tsx | #2 | Adicionar campo role |
| 🟠 ALTA | send-team-invitation/index.ts | #15, #14 | Email feedback + msgs |
| 🟡 MÉDIA | AcceptInvitation.tsx | #3, #4 | Validação senha + token early |
| 🟢 BAIXA | send-team-invitation/index.ts | #6 | Rate limit por usuario |
| 🟢 BAIXA | Nova migration | #11, #12, #13 | Auditoria + cron jobs |

