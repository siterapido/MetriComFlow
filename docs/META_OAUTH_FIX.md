# Correção de URLs OAuth do Meta - Guia Completo

## 🎯 Problema

Erro: **"URL bloqueada - O redirecionamento falhou porque o URL usado não está na lista de liberação nas configurações de OAuth do cliente do app"**

Este erro ocorre quando as URLs de redirecionamento não correspondem entre:
1. Meta Developer Console (configuração do app)
2. Variáveis de ambiente (Vercel/Supabase)
3. Código da aplicação (Edge Functions)

## ✅ Solução Implementada

### 1. URLs Configuradas

#### Produção
- **URL Base**: `https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app`
- **URL OAuth**: `https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app/meta-ads-config`

#### Desenvolvimento
- **URL Base**: `http://localhost:8082`
- **URL OAuth**: `http://localhost:8082/meta-ads-config`

### 2. Configuração no Meta Developer Console

**App ID**: `336112808735379` (CRMads)

**Passos para configurar:**

1. Acesse: https://developers.facebook.com/apps/336112808735379/settings/basic/

2. Role até a seção **"URIs de redirecionamento OAuth válidos"**

3. Adicione as seguintes URLs (uma por linha):
   ```
   https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
   http://localhost:8082/meta-ads-config
   ```

4. **IMPORTANTE**: Role até o final da página e clique em **"Salvar alterações"**

5. Aguarde alguns minutos para as alterações propagarem

### 3. Variáveis de Ambiente no Vercel

Já foram atualizadas automaticamente pelo script:

```bash
VITE_APP_URL=https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app
VITE_META_REDIRECT_URI=https://metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
VITE_META_APP_ID=336112808735379
VITE_META_APP_SECRET=7e6216e859be7639fa4de061536ce944
```

### 4. Verificar Configuração

Execute os seguintes comandos para verificar:

```bash
# Verificar variáveis no Vercel
vercel env ls

# Verificar secrets no Supabase
npx supabase secrets list

# Verificar logs do Edge Function
npx supabase functions logs meta-auth --project-id fjoaliipjfcnokermkhy
```

## 🔄 Fluxo OAuth Completo

### Diagrama do Fluxo

```
1. Usuário clica em "Conectar Meta Business"
   ↓
2. Frontend chama Edge Function meta-auth com action='get_auth_url'
   ↓
3. Edge Function retorna URL do Meta OAuth
   redirect_uri = VITE_META_REDIRECT_URI
   ↓
4. Usuário autoriza no Meta
   ↓
5. Meta redireciona para VITE_META_REDIRECT_URI + ?code=xxx
   ↓
6. Frontend chama Edge Function meta-auth com action='exchange_code'
   ↓
7. Edge Function troca code por access_token
   ↓
8. Token salvo em meta_business_connections
   ↓
9. Contas de anúncios sincronizadas em ad_accounts
```

### Pontos Críticos

**TODOS os seguintes devem usar a MESMA URL:**

1. **Meta Developer Console** → URIs de redirecionamento OAuth válidos
2. **Vercel** → `VITE_META_REDIRECT_URI`
3. **Edge Function meta-auth** → Linha 147 e 175 (usa redirect_uri do request ou origin)
4. **Frontend** → Hook `useMetaAuth` passa origin + '/meta-ads-config'

## 🛠️ Scripts de Manutenção

### Atualizar URLs (se mudar o domínio)

```bash
# Editar o script com a nova URL
vim scripts/update-meta-oauth-urls.sh

# Executar o script
./scripts/update-meta-oauth-urls.sh

# Fazer novo deploy
vercel --prod
```

### Verificar Meta Credentials

```bash
npm run verify:meta
```

## ⚠️ Troubleshooting

### Erro: "URL bloqueada"

**Causa**: URL não está na lista de redirecionamento do Meta

**Solução**:
1. Verifique se a URL está EXATAMENTE igual no Meta Developer Console
2. Aguarde 5 minutos após salvar no Meta
3. Limpe o cache do navegador
4. Tente novamente

### Erro: "Invalid authorization code"

**Causa**: Code OAuth expirado ou já foi usado

**Solução**:
1. Recarregue a página
2. Inicie o fluxo OAuth novamente
3. Não use o botão "voltar" do navegador durante o OAuth

### Erro: "Invalid Meta App ID"

**Causa**: APP_ID incorreto ou não configurado

**Solução**:
1. Verifique que `VITE_META_APP_ID=336112808735379` (CRMads)
2. Verifique Supabase secrets: `npx supabase secrets list`
3. Se necessário, configure: `npx supabase secrets set META_APP_ID="336112808735379"`

### Edge Function retorna erro

**Verificar logs**:
```bash
npx supabase functions logs meta-auth --project-id fjoaliipjfcnokermkhy
```

**Logs esperados**:
```
==================== META AUTH DEBUG ====================
Action: get_auth_url
META_APP_ID: 336112808735379
META_APP_ID is numeric: true
Expected APP_ID: 336112808735379 (CRMads)
✅ Using correct App ID: CRMads
========================================================
```

## 📊 Checklist de Configuração

Use este checklist para validar a configuração:

- [ ] Meta Developer Console tem as URLs corretas
- [ ] Vercel tem `VITE_APP_URL` e `VITE_META_REDIRECT_URI` corretas
- [ ] Supabase tem `META_APP_ID` e `META_APP_SECRET` nos secrets
- [ ] Edge Function `meta-auth` está deployado
- [ ] Frontend usa `useMetaAuth` corretamente
- [ ] Teste local funciona (localhost:8082)
- [ ] Teste produção funciona (URL Vercel)
- [ ] Ad accounts aparecem após conexão

## 🔗 Links Importantes

- **Meta Developer Console**: https://developers.facebook.com/apps/336112808735379
- **Vercel Dashboard**: https://vercel.com/mafcos-projects-ca629a4f/metri-com-flow
- **Supabase Dashboard**: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy
- **Meta Graph API Explorer**: https://developers.facebook.com/tools/explorer/

## 📝 Notas Adicionais

### Domínio Customizado

Se/quando configurar um domínio customizado (ex: `app.metricom.com.br`):

1. Atualizar script `update-meta-oauth-urls.sh` com nova URL
2. Executar o script
3. Atualizar Meta Developer Console
4. Fazer novo deploy: `vercel --prod`

### Ambiente de Staging

Para criar ambiente de staging:

1. Criar branch `staging` no Vercel
2. Configurar URL de staging (ex: `https://staging-metri-com-flow.vercel.app`)
3. Adicionar URL ao Meta Developer Console
4. Configurar variáveis de ambiente para staging

### Múltiplos Apps Meta

Se precisar de múltiplos apps (dev/staging/prod):

1. Criar apps separados no Meta for Developers
2. Usar variáveis de ambiente diferentes por environment
3. Atualizar Edge Functions para usar variáveis por environment

## 🎓 Referências

- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow)
- [Meta Business API](https://developers.facebook.com/docs/marketing-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
