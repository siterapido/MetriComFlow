# Configuração OAuth Meta Ads - Guia Completo

Este guia detalha como configurar corretamente o OAuth do Meta (Facebook) para o CRM Metricom Flow.

## 📋 Informações do App Meta

- **Nome do App:** CRMads
- **App ID:** `336112808735379`
- **Ambiente:** Produção
- **Console:** https://developers.facebook.com/apps/336112808735379/

---

## 🔧 Configuração no Meta Developer Console

### Passo 1: Acessar Configurações do App

1. Acesse: https://developers.facebook.com/apps/336112808735379/settings/basic/
2. Faça login com a conta administradora do app

### Passo 2: Configurar URLs de Redirecionamento OAuth

Na seção **"URIs de redirecionamento OAuth válidos"** (OAuth Redirect URIs), adicione as seguintes URLs:

#### URLs de Produção (Vercel):
```
https://metri-com-flow.vercel.app/meta-ads-config
https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
https://metri-com-flow-git-main-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
```

#### URLs de Desenvolvimento:
```
http://localhost:8082/meta-ads-config
```

⚠️ **IMPORTANTE:**
- Use EXATAMENTE estas URLs (incluindo `/meta-ads-config` no final)
- NÃO adicione barra final extra (não use `/meta-ads-config/`)
- O Meta é case-sensitive e exige match exato da URL

### Passo 3: Configurar Domínios do Aplicativo

Na seção **"Domínios do aplicativo"** (App Domains), adicione:

```
metri-com-flow.vercel.app
localhost
```

### Passo 4: Verificar Modo do App

- Certifique-se que o app está em modo **"Produção"** (Live)
- Se estiver em "Desenvolvimento", apenas usuários de teste poderão autenticar

### Passo 5: Verificar Permissões

Certifique-se que as seguintes permissões estão aprovadas:

- ✅ `ads_management` - Gerenciar contas de anúncios
- ✅ `ads_read` - Ler dados de anúncios
- ✅ `business_management` - Gerenciar ativos do Business Manager
- ✅ `leads_retrieval` - Recuperar leads (opcional, para futura integração)

### Passo 6: Salvar Alterações

1. Clique em **"Salvar alterações"** no final da página
2. Aguarde confirmação de que as mudanças foram salvas

---

## 🚀 Configuração no Vercel

### Variáveis de Ambiente Necessárias

Execute o script automático para atualizar as variáveis:

```bash
./scripts/update-vercel-meta-urls.sh
```

Ou configure manualmente:

```bash
# Remover variáveis antigas (se existirem)
vercel env rm VITE_APP_URL production --yes
vercel env rm VITE_META_REDIRECT_URI production --yes
vercel env rm VITE_META_APP_ID production --yes

# Adicionar novas variáveis
echo "https://metri-com-flow.vercel.app" | vercel env add VITE_APP_URL production
echo "https://metri-com-flow.vercel.app/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production
echo "336112808735379" | vercel env add VITE_META_APP_ID production
```

### Verificar Variáveis

```bash
vercel env ls
```

Devem existir:
- ✅ `VITE_APP_URL` (Production)
- ✅ `VITE_META_REDIRECT_URI` (Production)
- ✅ `VITE_META_APP_ID` (Production)
- ✅ `VITE_META_APP_SECRET` (Production)
- ✅ `VITE_SUPABASE_URL` (Production)
- ✅ `VITE_SUPABASE_ANON_KEY` (Production)

---

## 🔑 Configuração no Supabase

### Secrets das Edge Functions

Verificar secrets existentes:

```bash
npx supabase secrets list
```

Devem existir:
- ✅ `META_APP_ID`
- ✅ `META_APP_SECRET`
- ✅ `PROJECT_URL`
- ✅ `SERVICE_ROLE_KEY`

Se algum estiver faltando, adicione:

```bash
npx supabase secrets set META_APP_ID="336112808735379"
npx supabase secrets set META_APP_SECRET="seu_secret_aqui"
```

---

## 🧪 Testes

### 1. Testar em Localhost

```bash
# 1. Iniciar dev server
npm run dev

# 2. Acessar
# http://localhost:8082/meta-ads-config

# 3. Clicar em "Conectar Meta Business"

# 4. Autorizar no Meta

# 5. Verificar redirecionamento de volta para localhost
```

### 2. Testar em Produção

```bash
# 1. Fazer deploy
vercel --prod

# 2. Aguardar build completar

# 3. Acessar
# https://metri-com-flow.vercel.app/meta-ads-config

# 4. Clicar em "Conectar Meta Business"

# 5. Autorizar no Meta

# 6. Verificar redirecionamento de volta para produção
```

---

## ❌ Troubleshooting

### Erro: "URL bloqueada" ou "redirect_uri_mismatch"

**Causa:** A URL de redirecionamento não está na lista de URLs permitidas no Meta Developer Console.

**Solução:**
1. Acesse Meta Developer Console → Configurações Básicas
2. Verifique se a URL está EXATAMENTE como configurado (incluindo protocolo e path)
3. Salve novamente no Meta Developer Console
4. Aguarde 1-2 minutos para propagação
5. Limpe cache do navegador e teste novamente

### Erro: "Invalid application ID"

**Causa:** O Meta App ID está incorreto ou não foi configurado corretamente.

**Solução:**
1. Verifique o App ID no Meta Developer Console
2. Confirme que é `336112808735379` (CRMads)
3. Atualize os secrets do Supabase:
   ```bash
   npx supabase secrets set META_APP_ID="336112808735379"
   ```
4. Redeploy Edge Function:
   ```bash
   npx supabase functions deploy meta-auth
   ```

### Erro: "App não disponível"

**Causa:** O app está em modo de desenvolvimento e o usuário não é um testador.

**Solução:**
1. Acesse Meta Developer Console → Configurações Básicas
2. Mude o modo para "Produção" (Live)
3. Ou adicione o usuário em "Funções" → "Testadores"

### Erro: "authorization code has been used"

**Causa:** O código OAuth foi usado mais de uma vez (comum em React StrictMode).

**Solução:**
- ✅ **Não é um erro crítico** - o código atual já previne isso com:
  - `sessionStorage` para evitar reutilização
  - `lastHandledCodeRef` para evitar duplicação
- Se persistir, limpe sessionStorage e cookies

### OAuth funciona mas contas não aparecem

**Causa:** Erro ao salvar contas no banco de dados.

**Solução:**
1. Verificar logs da Edge Function:
   ```bash
   npx supabase functions logs meta-auth
   ```
2. Verificar RLS policies na tabela `ad_accounts`
3. Verificar se o usuário tem permissão de escrita

### Logs para Debugging

```bash
# Logs Supabase Edge Function
npx supabase functions logs meta-auth --project-ref fjoaliipjfcnokermkhy

# Logs Vercel (produção)
vercel logs https://metri-com-flow.vercel.app

# Logs locais (dev console)
# Abra DevTools → Console no navegador
```

---

## 📊 Fluxo OAuth Completo

```
1. Usuário clica "Conectar Meta Business"
   ↓
2. Hook `useMetaAuth.connectMetaBusiness()`
   ↓
3. Chama Edge Function `meta-auth` com action: 'get_auth_url'
   ↓
4. Edge Function retorna URL do Meta OAuth
   ↓
5. Redireciona usuário para Facebook.com
   ↓
6. Usuário autoriza app
   ↓
7. Meta redireciona para: {VITE_META_REDIRECT_URI}?code=xxx&state=yyy
   ↓
8. Hook detecta `code` na URL
   ↓
9. Chama Edge Function `meta-auth` com action: 'exchange_code'
   ↓
10. Edge Function troca code por access_token
    ↓
11. Edge Function busca dados do usuário no Meta
    ↓
12. Edge Function salva em `meta_business_connections`
    ↓
13. Edge Function busca contas de anúncios
    ↓
14. Edge Function salva em `ad_accounts`
    ↓
15. Retorna sucesso
    ↓
16. Hook atualiza UI
    ↓
17. ✅ Conexão estabelecida!
```

---

## 🔐 Segurança

### Boas Práticas

- ✅ Nunca exponha `META_APP_SECRET` no client-side
- ✅ Use sempre HTTPS em produção
- ✅ Valide `state` parameter para evitar CSRF
- ✅ Armazene tokens com criptografia
- ✅ Implemente token refresh para long-lived tokens
- ✅ Use RLS policies no Supabase para proteger dados

### Checklist de Segurança

- [ ] `META_APP_SECRET` está apenas em Supabase Secrets (nunca no código)
- [ ] `VITE_META_APP_SECRET` NÃO está em produção (apenas dev local)
- [ ] URLs de redirecionamento usam HTTPS em produção
- [ ] State parameter é validado na troca do código
- [ ] Access tokens são armazenados com segurança
- [ ] RLS está habilitado em todas as tabelas Meta

---

## 📚 Referências

- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [Meta Business Integration](https://developers.facebook.com/docs/marketing-api/business-asset-management)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## 📝 Checklist de Implementação

- [ ] URLs configuradas no Meta Developer Console
- [ ] Domínios configurados no Meta Developer Console
- [ ] App em modo Produção (Live)
- [ ] Permissões OAuth aprovadas
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Secrets configurados no Supabase
- [ ] Edge Function `meta-auth` deployada
- [ ] Teste OAuth em localhost funcionando
- [ ] Teste OAuth em produção funcionando
- [ ] Contas de anúncios sendo salvas corretamente
- [ ] Documentação atualizada

---

**Última atualização:** 2025-10-25
**Versão:** 1.0.0
