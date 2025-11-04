# 🧪 Plano de Testes - Sistema de Convites

**Data**: 2025-11-04
**Status**: 🟢 Pronto para testes
**Última refatoração**: Remoção do trigger que causava conflitos com RLS

---

## ✅ Resumo das Correções Validadas

### Arquivos Críticos Verificados:

#### 1. **Database Migrations**
- ✅ `supabase/migrations/20251023_team_invitations_system.sql`
  - Trigger problemático foi removido (linha 264-265)
  - Nota: Validação de expiração acontece em tempo de leitura

- ✅ `supabase/migrations/20251104000001_fix_rls_allow_admin_invitations.sql`
  - Políticas RLS permitem `role IN ('owner', 'admin')`

- ✅ `supabase/migrations/20251104000002_fix_metadata_column.sql`
  - Coluna `metadata JSONB` adicionada

- ✅ `supabase/migrations/20251104000003_fix_rls_policies.sql`
  - Políticas separadas para SELECT, INSERT, UPDATE, DELETE

#### 2. **Edge Functions**
- ✅ `supabase/functions/send-team-invitation/index.ts`
  - Verifica `organization_memberships.role` (linhas 190-205)
  - Deleta convite se email falhar (linhas 352-375)
  - Email feedback adequado

- ✅ `supabase/functions/accept-invitation/index.ts`
  - `email_confirm: true` removido (segurança)
  - Saga pattern com compensations implementado (linhas 79-269)

#### 3. **React Components**
- ✅ `src/components/team/InviteMemberDialog.tsx`
  - Campo `role` adicionado ao schema Zod
  - Grid 2 colunas (user_type + role)
  - Restrições de permissão (apenas owner vê owner/admin)

- ✅ `src/pages/AcceptInvitation.tsx`
  - `validatePassword()` implementado
  - Indicador visual de força (5 níveis)
  - Requisitos verificáveis em tempo real
  - Submit desabilitado até senha estar "média" ou melhor

---

## 🧪 Plano de Testes Manual

### Pré-requisitos
- [ ] Supabase migrations aplicadas localmente: `npx supabase db reset`
- [ ] Edge Functions deployadas: `npx supabase functions deploy send-team-invitation`
- [ ] Edge Functions deployadas: `npx supabase functions deploy accept-invitation`
- [ ] Frontend buildado: `npm run build:dev`
- [ ] Dev server rodando: `npm run dev` (porta 8082)

### Cenário 1: Admin Envia Convite (Fix #5)

**Pré-condições:**
- User A: owner da organização
- User B: admin da organização
- User C: manager da organização

**Teste:**
```
1. Login como User B (admin)
2. Navegar para /equipe
3. Clicar "Convidar novo membro"
4. Esperado: Dialog abre sem erro ✅
5. Preencher:
   - Email: newemail@example.com
   - Tipo: "CRM / Vendas" (sales)
   - Nível: "Manager - Pode gerenciar conteúdo"
6. Clicar "Enviar convite"
7. Esperado: Sucesso ✅ (não erro 400 de permissão)
```

**Validação:**
- ✅ Sem erro 400 "Você não tem permissão para gerenciar"
- ✅ Convite criado na BD (check `team_invitations` table)
- ✅ Email enviado (check logs ou inbox)

---

### Cenário 2: Email Requer Confirmação (Fix #7)

**Teste:**
```
1. Aceitar convite como novo usuário
2. Preencher:
   - Nome: "Test User"
   - Senha: "TestPass123!@#"
3. Clicar "Criar conta"
4. Esperado: Página mostra "Email enviado para confirmação"
5. Check BD:
   SELECT email, email_confirmed_at
   FROM auth.users
   WHERE email = 'newemail@example.com'
6. Esperado: email_confirmed_at = NULL ✅
```

**Validação:**
- ✅ Email não está confirmado automaticamente
- ✅ Usuário recebe email de confirmação
- ✅ Precisa confirmar email antes de usar conta

---

### Cenário 3: Compensação em Falha (Fix #8)

**Teste (requer simular erro):**
```
1. Adicionar log temporary na accept-invitation (para debug)
2. Tentar aceitar convite
3. Simular erro durante membership creation:
   - Modificar invite-acceptance para falhar em step 3
   - Esperado: Ver "↩️ Compensando..." nos logs
4. Check BD:
   - Usuário deve ser deletado (rollback)
   - Profile deve ser deletado (rollback)
   - Sem dados órfãos
5. Esperado: BD consistente ✅
```

**Validação:**
- ✅ Logs mostram compensações executadas
- ✅ Nenhum dado órfão na BD
- ✅ Erro apropriado para usuário

---

### Cenário 4: Dialog com Campo Role (Fix #2)

**Teste:**
```
1. Login como owner
2. Ir para /equipe → "Convidar novo membro"
3. Esperado: Ver todos 4 níveis de acesso ✅
   - Owner
   - Admin
   - Manager
   - Member
4. Login como admin (não-owner)
5. Ir para /equipe → "Convidar novo membro"
6. Esperado: Ver apenas 2 níveis ✅
   - Manager
   - Member
   - (Mensagem: "Apenas owners podem criar admin e owner roles")
```

**Validação:**
- ✅ Campo role visível no dialog
- ✅ Restrições de permissão funcionam
- ✅ Mensagem descritiva mostrada

---

### Cenário 5: Feedback de Email Falho (Fix #15)

**Teste (requer simular erro de email):**
```
1. Desabilitar RESEND_API_KEY:
   - Remover ou invalidar env var
   - Deploy send-team-invitation
2. Tentar enviar convite
3. Esperado: Erro 400 com mensagem clara ✅
   "Não foi possível enviar o email de convite. Tente novamente."
4. Check BD:
   - Convite deve ser deletado
   - Sem registro órfão
5. Esperado: Usuário recebe feedback ✅
```

**Validação:**
- ✅ Erro apropriado retornado (não sucesso falso)
- ✅ Convite deletado se email falhar
- ✅ BD permanece consistente

---

### Cenário 6: Validação de Senha (Fix #3)

**Teste:**
```
1. Aceitar convite como novo usuário
2. Preencher password: "123"
3. Esperado:
   - Indicador: "Muito fraca" (vermelho)
   - Submit button DESABILITADO ✅
   - Todos requisitos mostram ✗
4. Adicionar maiúscula: "Test123"
5. Esperado:
   - Indicador: "Fraca" (laranja)
   - Submit button DESABILITADO ✅
6. Adicionar especial: "Test123!@"
7. Esperado:
   - Indicador: "Forte" (azul)
   - Submit button HABILITADO ✅
8. Requisitos mostram:
   - ✓ Mínimo 8 caracteres
   - ✓ Pelo menos uma maiúscula
   - ✓ Pelo menos uma minúscula
   - ✓ Pelo menos um número
   - ✓ (opcional) Um caractere especial
```

**Validação:**
- ✅ Força da senha validada em tempo real
- ✅ UI visual clara (cores + checklist)
- ✅ Submit desabilitado até força mínima
- ✅ Requisitos são verificáveis

---

### Cenário 7: Fluxo Completo End-to-End

**Teste completo (25-30 minutos):**
```
1. User A (owner) loga no app
2. Vai para /equipe
3. Clica "Convidar novo membro"
4. Preenche:
   - Email: testuser@example.com
   - Tipo: sales
   - Role: manager
5. Clica "Enviar convite"
6. Esperado: Toast de sucesso ✅
7. Convite aparece na aba "Convites Pendentes" ✅
8. Check inbox de testuser@example.com
9. Clica link de convite: /accept-invitation?token=xyz
10. Preenche:
    - Nome: Test User
    - Senha: ValidPass123!@
11. Clica "Criar conta"
12. Esperado:
    - Redirecionado para /dashboard ✅
    - User pode acessar organização ✅
13. Check DB:
    - organization_memberships criada com role=manager ✅
    - Sem dados órfãos ✅
14. Fazer login como User A
15. Vai para /equipe
16. Esperado: Test User aparece na aba "Membros Ativos" ✅
    - Role: Manager ✅
    - User Type: Sales ✅
```

**Validação Final:**
- ✅ Convite enviado com sucesso
- ✅ Email recebido
- ✅ Novo usuário criado com email confirmação pendente
- ✅ Membership criada com role correto
- ✅ Sem dados órfãos em nenhum ponto
- ✅ Usuário pode usar app imediatamente

---

## 📋 Checklist de Deployment

### Antes de Deploy em Produção

- [ ] Testes manuais completados (6 cenários acima)
- [ ] Teste E2E do fluxo completo passou
- [ ] Logs verificados para compensações (deve ser raro)
- [ ] Sem erros no console do navegador
- [ ] Database backup feito
- [ ] Documentação atualizada

### Monitoramento Pós-Deploy (7 dias)

- [ ] Monitorar logs de `send-team-invitation` para erros
- [ ] Monitorar logs de `accept-invitation` para compensações
- [ ] Verificar se há tentativas de criar convites com role inválido
- [ ] Validar email delivery rate
- [ ] Alertas configurados para:
  - Erro na criação de convite
  - Compensação executada
  - Taxa de erro > 5%

---

## 🐛 Troubleshooting

### Erro: "trigger functions can only be called as triggers"
**Status**: ✅ FIXADO
- Causa: BEFORE INSERT trigger na original migration
- Solução: Trigger removido da migration 20251023
- Validação: Verificar BD que não existe trigger `trg_expire_team_invitation`

### Erro: "Could not find the 'metadata' column"
**Status**: ✅ FIXADO
- Causa: Coluna não existia na schema
- Solução: Migration 20251104000002 cria coluna
- Validação: `\d team_invitations` mostra metadata JSONB

### Erro: "Você não tem permissão para gerenciar esta organização"
**Status**: ✅ FIXADO
- Causa: RLS checava `owner_id = auth.uid()` apenas
- Solução: Migration 20251104000001 adiciona `admin` role
- Validação: Admins conseguem enviar convites

### Erro: RLS bloqueando INSERT mesmo após migration
**Status**: ⚠️ POSSÍVEL
- Causa: Schema cache em Supabase pode estar stale
- Solução:
  1. Force refresh: `NOTIFY pgrst, 'reload schema'`
  2. Ou: Redeploy Edge Function
  3. Ou: Aguarde propagação (até 30s)
- Validação: Tentar novamente após aguardar

---

## ✨ Notas Importantes

1. **Expiração de Convite**: Não há mais trigger BEFORE INSERT. Validação acontece quando:
   - AcceptInvitation carrega: `if (new Date(expires_at) < new Date())`
   - User tenta aceitar convite expirado

2. **Email Confirmação**: Supabase envia email padrão após criar user
   - Não há mais `email_confirm: true` (automático)
   - User precisa confirmar email antes de usar conta
   - Email confirmation link é válido por padrão 24h

3. **Compensation Pattern**: Implementado com LIFO (Last In, First Out)
   - Se step 5 falhar, compensações executam: 4 → 3 → 2 → 1
   - Cada compensação tem tratamento de erro independente
   - Logs mostram "↩️ Compensando..." para rastreabilidade

4. **RLS Policies**: Split em 4 políticas (SELECT, INSERT, UPDATE, DELETE)
   - Cada uma verifica `role IN ('owner', 'admin')`
   - Mais seguro e mais fácil manter que política monolítica

---

## 📞 Contato & Suporte

Se encontrar problemas:
1. Verifique logs: `npx supabase functions logs send-team-invitation`
2. Verifique schema BD: Confirme que trigger foi removido
3. Force rebuild: `npm run build:dev`
4. Reset local DB: `npx supabase db reset`
5. Limpe cache do navegador: Ctrl+Shift+Delete

---

**Última atualização**: 2025-11-04
**Versão de testes**: 1.0
**Próximo passo**: Executar Cenário 1 (Admin Sends Invite)
