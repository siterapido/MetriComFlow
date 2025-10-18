# Meta OAuth Troubleshooting Guide

Este guia ajuda a diagnosticar e resolver problemas com a integração do Meta Business OAuth.

## Erro 400: Bad Request na Edge Function

### Sintomas
```
POST https://[projeto].supabase.co/functions/v1/meta-auth 400 (Bad Request)
FunctionsHttpError: Edge Function returned a non-2xx status code
```

### Causas Comuns

#### 1. Redirect URI não corresponde
O `redirect_uri` usado no OAuth deve ser **exatamente** o mesmo em:
- `.env` (`VITE_META_REDIRECT_URI`)
- Meta for Developers → App Settings → Valid OAuth Redirect URIs
- Chamada para a Edge Function

**Solução:**
```bash
# Verificar .env
cat .env | grep VITE_META_REDIRECT_URI

# Deve ser: http://localhost:8082/meta-ads-config (desenvolvimento)
# Ou: https://seu-dominio.vercel.app/meta-ads-config (produção)
```

Verificar no [Meta for Developers](https://developers.facebook.com/apps/):
1. Selecione o App (CRMads - 336112808735379)
2. Settings → Basic → App Domains
3. Facebook Login → Settings → Valid OAuth Redirect URIs

#### 2. Meta App Secrets não configurados no Supabase

**Verificar:**
```bash
npx supabase secrets list | grep META
```

Devem aparecer:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN` (opcional)

**Solução:**
```bash
./scripts/setup-meta-secrets.sh
```

Depois de configurar os secrets, **sempre redesploy** a função:
```bash
npx supabase functions deploy meta-auth
```

#### 3. App ID ou Secret inválidos

**Verificar:**
```bash
# O App ID deve ser numérico
echo $VITE_META_APP_ID
# Resultado esperado: 336112808735379

# Testar se o App existe
./scripts/test-meta-connection.sh
```

**Obter credenciais corretas:**
1. Acesse [Meta for Developers](https://developers.facebook.com/apps/)
2. Selecione o App "CRMads"
3. Settings → Basic
4. Copie o **App ID** e **App Secret**

#### 4. Código OAuth já foi usado

**Sintoma:**
```
authorization code has been used
```

**Causa:** React 18 StrictMode executa effects duas vezes em desenvolvimento.

**Solução:** Já implementado no código (deduplicação automática).

#### 5. Edge Function não deployada ou desatualizada

**Solução:**
```bash
npx supabase functions deploy meta-auth
```

## Como Debugar

### 1. Adicionar logs detalhados

Abra o Console do navegador (F12) e refaça o fluxo OAuth. Procure por:
```
🔄 Exchanging code with redirect_uri: ...
📥 Response from meta-auth: ...
❌ Supabase function error: ...
```

### 2. Verificar logs da Edge Function

No [Supabase Dashboard](https://supabase.com/dashboard):
1. Selecione o projeto
2. Edge Functions → meta-auth
3. Logs (aba superior)

Procure por:
```
==================== META AUTH DEBUG ====================
Action: exchange_code
META_APP_ID: ...
Redirect URI: ...
```

### 3. Testar manualmente o token exchange

```bash
# 1. Obter o código OAuth (faça login no navegador e copie da URL)
CODE="código_da_url"

# 2. Testar troca do código
curl -X POST https://graph.facebook.com/v24.0/oauth/access_token \
  -d "client_id=336112808735379" \
  -d "client_secret=SEU_SECRET" \
  -d "redirect_uri=http://localhost:8082/meta-ads-config" \
  -d "code=$CODE"
```

### 4. Verificar permissões do App Meta

No [Meta for Developers](https://developers.facebook.com/apps/):
1. App Review → Permissions and Features
2. Verificar se estas permissões estão aprovadas ou em modo de teste:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `leads_retrieval`

**Modo de Desenvolvimento:**
- Em desenvolvimento, você precisa adicionar usuários de teste
- App Roles → Roles → Add Testers
- Usuários de teste podem usar todas as permissões sem aprovação

## Checklist de Verificação Completa

- [ ] `.env` contém `VITE_META_REDIRECT_URI`
- [ ] Redirect URI configurado no Meta for Developers
- [ ] Supabase Secrets configurados (`META_APP_ID`, `META_APP_SECRET`)
- [ ] Edge Function `meta-auth` deployada
- [ ] App ID é numérico e válido
- [ ] Usuário é tester do App (ou App está em produção)
- [ ] Permissões necessárias estão aprovadas
- [ ] Navegador não está bloqueando cookies de terceiros

## Scripts Úteis

```bash
# Verificar configuração completa
./scripts/test-meta-connection.sh

# Configurar/resetar secrets do Meta
./scripts/setup-meta-secrets.sh

# Redesploy da Edge Function
npx supabase functions deploy meta-auth

# Verificar secrets configurados
npx supabase secrets list | grep META
```

## URLs de Referência

- [Meta for Developers](https://developers.facebook.com/apps/336112808735379)
- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [Supabase Dashboard](https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy)
- [Meta App: CRMads](https://developers.facebook.com/apps/336112808735379/dashboard/)

## Contato

Se o problema persistir após seguir este guia, verifique:
1. Logs completos no console do navegador
2. Logs da Edge Function no Supabase Dashboard
3. Screenshots do erro e da configuração do Meta App
