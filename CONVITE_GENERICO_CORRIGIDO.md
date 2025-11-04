# ✅ CORREÇÃO - ACEITAR CONVITES GENÉRICOS

**Data**: 2025-11-04 18:30 UTC
**Problema Resolvido**: Erro HTTP 400 ao aceitar convites genéricos
**Versão**: accept-invitation v113

---

## 🐛 PROBLEMA IDENTIFICADO

Ao tentar aceitar um convite genérico (link sem email específico), o sistema retornava erro **HTTP 400**.

**Causa raiz**:
A Edge Function `accept-invitation` tentava buscar o perfil do usuário usando o **email sintético** do convite (`invite+xxx@link.insightfy.local`), mas o usuário estava fornecendo um **email real** no formulário de cadastro.

**Fluxo com erro**:
```
1. Gera convite genérico → email sintético: "invite+0852b85c@link.insightfy.local"
2. Usuário abre link e preenche email real: "joao@empresa.com"
3. Edge Function busca perfil por "invite+0852b85c@link.insightfy.local" ❌
4. Não encontra → tenta criar usuário com email sintético ❌
5. ERRO HTTP 400
```

---

## ✅ CORREÇÃO APLICADA

**Edge Function**: `accept-invitation` → versão 113

### Mudanças:

1. **Novo campo no payload**: `email` (email real do usuário)
   ```typescript
   interface AcceptInvitationRequest {
     token: string;
     password?: string;
     full_name?: string;
     email?: string; // NOVO: email real do usuário
   }
   ```

2. **Detecção de convite genérico**:
   ```typescript
   const isGenericInvite = invitation.email.includes("@link.insightfy.local");
   ```

3. **Seleção do email correto**:
   ```typescript
   const targetEmail = isGenericInvite
     ? (userEmail || "").trim()      // Se genérico → usa email do usuário
     : invitation.email;              // Se específico → usa email do convite
   ```

4. **Criação de usuário com email correto**:
   ```typescript
   await supabase.auth.admin.createUser({
     email: targetEmail,  // Email REAL, não sintético
     password,
     user_metadata: { full_name }
   });
   ```

---

## 🧪 COMO TESTAR

### Teste 1: Criar Novo Convite Genérico

1. Vá para **https://www.insightfy.com.br/equipe**
2. Clique em **"Gerar link de convite"**
3. ✅ Link aparece no campo → copie
4. Abra o link em navegador privado/anônimo

### Teste 2: Aceitar Convite (Novo Usuário)

**URL do convite**: `https://www.insightfy.com.br/accept-invitation?token=xxx`

1. **Preencha os campos**:
   - Email: `seu-email-real@empresa.com` ← **Email real, não sintético!**
   - Senha: `senha123`
   - Nome completo: `Seu Nome`

2. **Clique "Criar conta e entrar"**

3. **✅ Resultado Esperado**:
   - Sem erro HTTP 400
   - Toast: "Bem-vindo à [Nome da Organização]!"
   - Redireciona para /dashboard
   - Usuário vinculado à organização

4. **❌ Se ainda der erro**:
   - Abra DevTools (F12)
   - Aba Network → Filtrar por "accept-invitation"
   - Ver resposta da requisição POST
   - Tirar screenshot e enviar

---

## 🔍 VERIFICAÇÃO TÉCNICA

### Edge Function Version

```bash
# Verificar versão deployada
npx supabase functions list
```

**Esperado**: `accept-invitation` versão **113** ou superior

### Logs da Edge Function

```bash
# Ver logs em tempo real
npx supabase functions logs accept-invitation
```

**Buscar por**:
- `📧 Email do usuário: [email] (genérico: true)`
- `👤 Criando novo usuário para: [email-real]`
- `✅ Perfil criado com sucesso`

### Payload de Teste (cURL)

```bash
curl -X POST https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "token": "SEU_TOKEN_AQUI",
    "email": "teste@empresa.com",
    "password": "senha123",
    "full_name": "Nome Teste"
  }'
```

**Resposta esperada** (HTTP 200):
```json
{
  "success": true,
  "user_id": "uuid",
  "organization_id": "uuid",
  "organization_name": "Nome da Org",
  "is_new_user": true,
  "message": "Bem-vindo à [Nome da Org]!"
}
```

---

## 📊 TESTES REALIZADOS

| Teste | Status | Detalhes |
|-------|--------|----------|
| Edge Function v113 deployada | ✅ | Versão ativa no Supabase |
| Código corrigido | ✅ | Detecta convites genéricos |
| Email real usado | ✅ | targetEmail seleciona corretamente |
| Logs implementados | ✅ | Console mostra email e tipo |

---

## 🎯 PRÓXIMOS PASSOS

1. **Teste em produção**: Gere novo link e teste aceitação
2. **Verifique logs**: Acompanhe logs da Edge Function durante teste
3. **Reporte resultado**: Informe se funcionou ou se ainda há erro

---

## 🔧 ARQUIVOS MODIFICADOS

- ✅ `supabase/functions/accept-invitation/index.ts` (linhas 14-89)
  - Adicionado campo `email` no interface
  - Detecta convites genéricos
  - Usa email correto (real ou do convite)
  - Logs de debug

---

## ✨ RESUMO

**Antes**:
- ❌ Convite genérico → email sintético usado → erro 400

**Depois**:
- ✅ Convite genérico → detectado automaticamente
- ✅ Email real do usuário usado
- ✅ Conta criada com email correto
- ✅ Usuário vinculado à organização

**Status**: 🟢 **PRONTO PARA TESTES EM PRODUÇÃO**

---

**Criado**: 2025-11-04 18:30 UTC
**Versão Edge Function**: accept-invitation v113
**Responsável**: Claude Code (AI Assistant)
