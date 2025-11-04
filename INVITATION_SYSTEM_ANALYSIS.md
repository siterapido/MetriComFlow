# RELATÓRIO DE ANÁLISE: SISTEMA DE CONVITES PARA ORGANIZAÇÃO

## 1. FLUXO ATUAL DO SISTEMA DE CONVITES

### 1.1 Fluxo Completo (Passo a Passo)

```
┌─────────────────────────────────────────────────────────────────┐
│                   ENVIO DE CONVITE                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Usuario (Owner) acessa /equipe (TeamManagement)              │
│ 2. Clica em "Convidar membro" → abre InviteMemberDialog        │
│ 3. Preenche: email, tipo_usuario (sales/traffic_manager/owner) │
│ 4. Clica "Enviar convite" → chamada useInvitations.sendInvite()│
│                                                                   │
│ LADO DO CLIENTE (Frontend):                                     │
│ └─> useInvitations.ts:                                          │
│     - Validação do Schema: email + user_type (obrigatórios)     │
│     - Chamada da Edge Function 'send-team-invitation'           │
│     - Passa: email, role (default 'member'), user_type, org_id  │
│     - Retorna: success, invite_link, message                    │
│                                                                   │
│ LADO DO SERVIDOR (Edge Function):                               │
│ └─> send-team-invitation/index.ts:                              │
│     - Valida Token JWT do usuário (verificar autenticação)      │
│     - Confirma que usuario é OWNER da organização               │
│     - Valida email (domínios suspeitos bloqueados)              │
│     - Verifica Rate Limit (max 10 convites/hora por org)        │
│     - Verifica se usuário já é membro (evita duplicatas)        │
│     - Verifica se já há convite pendente (evita duplicatas)     │
│     - Gera UUID aleatório como token                            │
│     - Cria registro em 'team_invitations' com status='pending'  │
│     - Envia email via Resend (fallback Supabase Auth invite)    │
│     - Retorna: success=true, invite_link                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               ACEITAÇÃO DO CONVITE                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Usuario recebe email com link: /accept-invitation?token=xxx  │
│ 2. Clica no link → AcceptInvitation page carregada              │
│ 3. Se NOT logged: exibe formulário para criar conta             │
│    - Nome completo, Senha                                       │
│ 4. Se logged: apenas mostra informações do convite              │
│ 5. Clica "Aceitar" (ou "Criar conta e entrar")                 │
│                                                                   │
│ LADO DO CLIENTE (Frontend):                                     │
│ └─> AcceptInvitation.tsx:                                       │
│     - Valida token via RPC 'get_invitation_by_token'            │
│     - Verifica status != 'pending' (já aceito/revogado/expirado)│
│     - Verifica if expires_at < NOW() (expirou)                  │
│     - Chama Edge Function 'accept-invitation'                   │
│     - Passa: token, full_name?, password?                       │
│     - Redireciona para /login após sucesso                      │
│                                                                   │
│ LADO DO SERVIDOR (Edge Function):                               │
│ └─> accept-invitation/index.ts:                                 │
│     - Recupera convite pelo token via RPC                       │
│     - Valida se convite está 'pending' e não expirou            │
│     - Busca perfil existente pelo email                         │
│     - SE NÃO EXISTE:                                            │
│       - Cria novo usuário em auth.users (com email verificado) │
│       - Cria novo perfil em profiles (user_type do convite)     │
│     - SE JÁ EXISTE:                                             │
│       - Atualiza user_type se diferente                         │
│     - Verifica se já é membro ativo (evita duplicatas)          │
│     - Se é membro inativo: reativa (update is_active=true)      │
│     - Se não é membro: cria novo registro organization_member   │
│     - Marca convite como 'accepted'                             │
│     - Define org como active_organization_id no perfil          │
│     - Retorna: success=true, user_id, organization_id           │
│                                                                   │
│ RESULTADO FINAL:                                                │
│ └─> Usuario criado/ativado + membro da organização + logado   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Funcionalidades Adicionais

#### Reenvio de Convite
- **Trigger**: Clique em "Reenviar convite" na aba Convites Pendentes
- **Ação**: useInvitations.resendInvitation()
  1. Revoga convite anterior (status='revoked')
  2. Cria novo convite com mesmo email
  3. Envia novo email com novo token

#### Revogação de Convite
- **Trigger**: Clique em "Revogar convite"
- **Ação**: useInvitations.revokeInvitation()
  1. Atualiza status='revoked' no banco
  2. Convite não pode mais ser aceito

---

## 2. COMPONENTES E FUNCIONES ENVOLVIDOS

### 2.1 Frontend - Hooks

| Hook | Arquivo | Responsabilidade |
|------|---------|------------------|
| `useInvitations()` | `/src/hooks/useInvitations.ts` | Gerencia envio, revogação, reenvio de convites |
| `useTeamManagement()` | `/src/hooks/useTeamManagement.ts` | Hook unificado para team + invitations + filtros |
| `useTeam()` | `/src/hooks/useTeam.ts` | Gerencia membros ativos da organização |
| `useActiveOrganization()` | `/src/hooks/useActiveOrganization.ts` | Obtém organização ativa do usuário |

### 2.2 Frontend - Componentes UI

| Componente | Arquivo | Função |
|-----------|---------|--------|
| `InviteMemberDialog` | `/src/components/team/InviteMemberDialog.tsx` | Dialog para enviar novo convite |
| `InvitationCard` | `/src/components/team/InvitationCard.tsx` | Card exibindo um convite pendente |
| `UnifiedMemberCard` | `/src/components/team/UnifiedMemberCard.tsx` | Card exibindo um membro ativo |
| `TeamManagement` (página) | `/src/pages/TeamManagement.tsx` | Página unificada de gestão de equipe |
| `AcceptInvitation` (página) | `/src/pages/AcceptInvitation.tsx` | Página de aceitação do convite |

### 2.3 Backend - Edge Functions

| Function | Arquivo | Responsabilidade |
|----------|---------|------------------|
| `send-team-invitation` | `/supabase/functions/send-team-invitation/index.ts` | Cria convite, envia email |
| `accept-invitation` | `/supabase/functions/accept-invitation/index.ts` | Processa aceitação, cria usuario/membro |

### 2.4 Backend - Database

| Tabela | Arquivo Criação | Função |
|--------|-----------------|--------|
| `organizations` | `20251023_team_invitations_system.sql` | Organização/Workspace |
| `organization_memberships` | `20251023_team_invitations_system.sql` | Mapa usuario → org + role |
| `team_invitations` | `20251023_team_invitations_system.sql` | Convites pendentes |
| `profiles` | (anterior) | Perfil usuario (contem user_type) |

---

## 3. DADOS NECESSÁRIOS E FLUXO DE DADOS

### 3.1 Campos Requeridos para Enviar Convite

```typescript
interface InvitationPayload {
  email: string;                          // OBRIGATÓRIO: email válido
  user_type: "sales" | "traffic_manager" | "owner";  // OBRIGATÓRIO
  role?: "owner" | "admin" | "manager" | "member";  // OPCIONAL (default: 'member')
  organization_id?: string;               // OPCIONAL (inferido do owner)
}
```

### 3.2 Schema da Tabela `team_invitations`

```sql
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL DEFAULT 'member',
  user_type TEXT NOT NULL DEFAULT 'sales',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|accepted|expired|revoked
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + 7 days,
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);
```

### 3.3 RLS Policies

**Leitura**: Apenas owners da organização
```sql
CREATE POLICY "Owners can view organization invitations"
  ON team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = team_invitations.organization_id
        AND owner_id = auth.uid()
    )
  );
```

**Escrita**: Apenas owners da organização
```sql
CREATE POLICY "Owners can manage organization invitations"
  ON team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = team_invitations.organization_id
        AND owner_id = auth.uid()
    )
  );
```

---

## 4. PROBLEMAS IDENTIFICADOS

### 4.1 CRÍTICOS (Falhas de Funcionalidade)

#### ❌ Issue #1: Role vs User Type Mismatch
**Problema**: O sistema trata "role" e "user_type" como conceitos separados mas relacionados.
- **Role**: Permissão na organização (owner/admin/manager/member) - define ACESSO
- **User Type**: Tipo de perfil (owner/traffic_manager/sales) - define FUNÇÃO
- **Risco**: Confusão ao estabelecer permissões. Um "sales" com role "owner" teria muito acesso.

**Localização**: 
- InviteMemberDialog.tsx (linha 29) - schema só tem `user_type`
- send-team-invitation/index.ts (linhas 25-26, 157-158) - cria convite com ambos

**Impacto**: MÉDIO - Sistema funciona mas lógica é confusa

---

#### ❌ Issue #2: Dialog Não Expõe Campo de Role
**Problema**: InviteMemberDialog.tsx só permite selecionar `user_type`, não `role`.
- O usuário NÃO pode escolher role (sempre 'member')
- Convites criados com role hardcoded para 'member'

**Localização**: 
- InviteMemberDialog.tsx (linhas 27-30) - schema não inclui role
- InviteMemberDialog.tsx (linhas 148-161) - select apenas para user_type

**Código Atual**:
```typescript
const inviteSchema = z.object({
  email: z.string().email("Informe um email válido"),
  user_type: z.enum(["sales", "traffic_manager", "owner"]),  // SEM role
});
```

**Impacto**: ALTO - Impossível criar admins/managers via UI, sempre 'member'

---

#### ❌ Issue #3: Falta Validação de Senha Miniminha
**Problema**: AcceptInvitation.tsx não valida força da senha.
- Usuário pode criar conta com senha fraca (ex: "abc")
- Sem mensagem de erro de validação

**Localização**: 
- AcceptInvitation.tsx (linhas 170-180) - Input sem validação
- accept-invitation/index.ts (linhas 93-99) - nenhuma validação

**Impacto**: MÉDIO - Segurança reduzida

---

#### ❌ Issue #4: Token Não é Validado no Frontend Antes de Envio
**Problema**: AcceptInvitation tenta enviar mesmo com erro no token.
- Se token inválido, RPC retorna 0 linhas
- Frontend ainda tenta chamar Edge Function com token inválido
- Causa erro desnecessário

**Localização**: 
- AcceptInvitation.tsx (linhas 86-129) - handleAccept sem validação early

**Código Problemático**:
```typescript
const handleAccept = async () => {
  if (!token) {  // Valida aqui
    setError("Token inválido");
    return;
  }
  // ... mas invitation já foi validado antes!
  const { data, error: functionError } = await supabase.functions.invoke(...)
```

**Impacto**: BAIXO - UX ruim, funciona eventualmente

---

### 4.2 FALHAS DE SEGURANÇA

#### 🔒 Issue #5: RLS Policy Muito Restritiva para Admins
**Problema**: Apenas OWNER pode ver/gerenciar convites, não admins.
- Tabela team_invitations RLS (linha 219-256): `owner_id = auth.uid()`
- Admin da organização NÃO pode enviar convites
- Apenas owner pode

**Localização**: 
- 20251023_team_invitations_system.sql (linhas 219-256)
- send-team-invitation/index.ts (linhas 210-212) - verifica owner

**Política Atual**:
```sql
CREATE POLICY "Owners can manage organization invitations"
  ON team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = team_invitations.organization_id
        AND owner_id = auth.uid()  -- SÓ OWNER!
    )
  );
```

**Impacto**: ALTO - Limita funcionalidade, admins não podem gerenciar convites

---

#### 🔒 Issue #6: Falta Validação de Rate Limit por Usuário
**Problema**: Rate limit é por organização (10 convites/hora), não por usuário.
- Um usuario owner pode spammar 10 convites rapidamente
- Sem proteção contra abuso individual

**Localização**: 
- send-team-invitation/index.ts (linhas 214-225)

**Código Problemático**:
```typescript
const rateWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const { count: recentInvites } = await supabase
  .from("team_invitations")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", organization.id)  // Verifica ORGANIZAÇÃO, não usuário
  .gte("created_at", rateWindow);
```

**Impacto**: MÉDIO - Segurança contra spam reduzida

---

#### 🔒 Issue #7: Sem Confirmação de Email na Aceitação
**Problema**: Ao criar novo usuario, email não é verificado novamente.
- `createUser(..., email_confirm: true)` - marca como verificado automaticamente
- Se invasor usa email de outra pessoa, não precisa verificar

**Localização**: 
- accept-invitation/index.ts (linhas 103-110)

**Código Problemático**:
```typescript
const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
  email: invitation.email,
  password,
  email_confirm: true,  // ⚠️ SEM VERIFICAÇÃO!
  user_metadata: { full_name },
});
```

**Impacto**: ALTO - Risco de takeover se token vazar

---

### 4.3 FALHAS DE INTEGRIDADE DE DADOS

#### 📊 Issue #8: Falta Sincronização Entre Tabelas
**Problema**: Quando usuario aceita convite, múltiplas tabelas são modificadas:
- `auth.users` (criado)
- `profiles` (criado/atualizado)
- `organization_memberships` (criado/reativado)
- `team_invitations` (atualizado status)
- `profiles.active_organization_id` (atualizado)

Se 1 falhar no meio, dados ficam inconsistentes.

**Localização**: 
- accept-invitation/index.ts (linhas 69-207)

**Exemplo**: Se `organization_memberships.insert()` falhar:
- Usuario criado em auth.users ✓
- Profile criado ✓
- Mas membership NÃO criado ✗
- Usuario pode fazer login mas não tem acesso à organização

**Impacto**: ALTO - Dados inconsistentes, usuarios travados

---

#### 📊 Issue #9: Sem Compensação para Falhas Parciais
**Problema**: Sem try/catch ou rollback entre operações críticas.
- Se update de `active_organization_id` falha (linhas 199-207), resto já foi executado
- Sem mecanismo para reverter

**Localização**: 
- accept-invitation/index.ts (linhas 190-207)

**Código Problemático**:
```typescript
// Sem proteção - se isso falhar, resto já foi executado
const { error: prefErr } = await supabase
  .from('profiles')
  .update({ active_organization_id: invitation.organization_id })
  .eq('id', userId);
if (prefErr) console.error('...')  // SÓ LOGA!
```

**Impacto**: MÉDIO - Acesso funcionaria mesmo com erro

---

#### 📊 Issue #10: Sem Validação de Unicidade de Email + Org
**Problema**: Não há constraint UNIQUE(email, organization_id).
- Teoricamente dois convites para mesmo email na mesma org podem existir
- ÍNDICE existe (linha 209-211) mas é PARCIAL (only for pending status)

**Localização**: 
- 20251023_team_invitations_system.sql (linhas 209-211)

**Índice Atual**:
```sql
CREATE UNIQUE INDEX idx_team_invitations_pending_unique
  ON team_invitations (email, organization_id)
  WHERE status = 'pending';  -- SÓ PARA PENDING!
```

**Se ocorrer**: 
1. Revoga convite anterior
2. Cria novo convite
- ENTRE essas duas operações, ambos podem existir

**Impacto**: BAIXO - Improvável ocorrer, indice protege pending

---

### 4.4 FALHAS OPERACIONAIS

#### ⚙️ Issue #11: Sem Logs de Auditoria
**Problema**: Nenhum registro de:
- Quem enviou o convite
- Quando foi reenviado
- Quem aceitou e de onde

**Localização**: 
- Nenhuma tabela de auditoria
- Apenas logs em console do Edge Function

**Impacto**: MÉDIO - Difícil investigar problemas/abuso

---

#### ⚙️ Issue #12: Expiração Manual
**Problema**: Convites não expiram automaticamente.
- Trigger `expire_old_team_invitations` (linhas 263-277) só roda em UPDATE/INSERT
- Convite criado hoje com 7 dias pode ficar "pending" por meses se nunca atualizado

**Localização**: 
- 20251023_team_invitations_system.sql (linhas 263-277)

**Trigger Atual**:
```sql
CREATE TRIGGER trg_expire_team_invitation
  BEFORE INSERT OR UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.expire_old_team_invitations();
```

**Problema**: Só executa em INSERT/UPDATE, não em SELECT/time passage

**Impacto**: BAIXO - Convites expirados ainda mostram como pending até resgatar

---

#### ⚙️ Issue #13: Sem Mecanismo de Limpeza
**Problema**: Não há job para limpar invites revoked/expired.
- Tabela cresce indefinidamente
- Sem cleanup automático

**Localização**: 
- Nenhuma migração com cron job

**Impacto**: BAIXO - Performance pode degradar com tempo

---

### 4.5 FALHAS DE UX

#### 👥 Issue #14: Mensagens de Erro Genéricas
**Problema**: Usuario recebe mensagens técnicas ao invés de helpful.
- "Somente owners podem enviar convites" - poderia explicar por que
- "Já existe um convite pendente para este email" - poderia oferecer opção de reenviar

**Localização**: 
- send-team-invitation/index.ts (linhas 211, 224, 243, 256)

**Impacto**: BAIXO - UX confusa

---

#### 👥 Issue #15: Falta Feedback de Email
**Problema**: Se email falha no envio, usuario não sabe.
- Convite criado mas email não enviado
- Usuario pensa que tudo OK mas colega nunca recebe

**Localização**: 
- send-team-invitation/index.ts (linhas 290-300)

**Código Problemático**:
```typescript
try {
  await sendEmailInvitation({...});
  console.log("✅ Convite enviado por email");
} catch (emailError) {
  console.error("Falha no envio do email, mantendo convite criado:", emailError);
  // ⚠️ NÃO RETORNA ERRO! Continua como sucesso
}
```

**Resultado**: 
- Retorna `success: true` mesmo que email falhe
- Usuario não sabe que email não foi enviado

**Impacto**: ALTO - Usuarios não recebem convites

---

## 5. O QUE ESTÁ FUNCIONANDO COMPLETAMENTE

✅ **Fluxo Base de Envio**
- Criar convite com validações básicas
- Armazenar em banco de dados
- Gerar token único

✅ **Fluxo Base de Aceitação**
- Validar token
- Criar usuario (se não existir)
- Criar membership
- Marcar convite como aceito

✅ **Reenvio e Revogação**
- Funciona corretamente
- Valida permissões

✅ **UI e Diálogos**
- InviteMemberDialog bem desenhado
- InvitationCard mostra informações úteis
- TeamManagement unificado

✅ **Filtragem e Busca**
- Filtros por role/user_type funcionam
- Busca por nome/email funciona

✅ **Proteção Básica contra Spam**
- Rate limit por organização
- Bloqueio de domínios suspeitos
- Verificação de duplicatas

---

## 6. SUMÁRIO DE PRIORIDADE DE CORREÇÃO

| Prioridade | Issue | Impacto | Dificuldade |
|-----------|-------|--------|-------------|
| 🔴 CRÍTICA | #5 RLS muito restritiva (admin) | ALTO | MÉDIA |
| 🔴 CRÍTICA | #7 Sem confirmação email | ALTO | MÉDIA |
| 🔴 CRÍTICA | #8 Sincronização de dados | ALTO | ALTA |
| 🟠 ALTA | #2 Dialog não expõe role | ALTO | BAIXA |
| 🟠 ALTA | #15 Feedback de email falho | ALTO | BAIXA |
| 🟠 ALTA | #1 Role vs user_type confuso | MÉDIA | ALTA |
| 🟡 MÉDIA | #3 Senha sem validação | MÉDIA | BAIXA |
| 🟡 MÉDIA | #6 Rate limit por usuario | MÉDIA | MÉDIA |
| 🟢 BAIXA | #4 Token validation | BAIXA | BAIXA |
| 🟢 BAIXA | #9 Sem compensação | BAIXA | MÉDIA |
| 🟢 BAIXA | #10 Unicidade de email | BAIXA | BAIXA |
| 🟢 BAIXA | #11 Sem auditoria | BAIXA | MÉDIA |
| 🟢 BAIXA | #12 Expiração manual | BAIXA | MÉDIA |
| 🟢 BAIXA | #13 Sem limpeza | BAIXA | BAIXA |
| 🟢 BAIXA | #14 Mensagens genéricas | BAIXA | BAIXA |

---

## 7. RECOMENDAÇÕES FINAIS

1. **Primeiro**: Corrigir Issue #5 (RLS) e #7 (email confirm) - segurança crítica
2. **Segundo**: Implementar Issue #2 (role dialog) - funcionalidade essencial
3. **Terceiro**: Adicionar transação/rollback para Issue #8 - integridade de dados
4. **Quarto**: Melhorar feedback de erro para Issue #15 - UX

