# Como Testar o Meta OAuth (Passo a Passo)

## ✅ Pré-requisitos

Antes de testar, certifique-se de que:

1. **Secrets estão configurados no Supabase:**
   ```bash
   npx supabase secrets list | grep META
   ```

   Deve aparecer:
   - `META_APP_ID`
   - `META_APP_SECRET`
   - (Opcionalmente) `META_ACCESS_TOKEN`

2. **Edge Function está deployada:**
   ```bash
   npx supabase functions deploy meta-auth
   ```

3. **Variáveis de ambiente no `.env`:**
   ```bash
   VITE_META_REDIRECT_URI=http://localhost:8082/meta-ads-config
   ```

## 🧪 Teste Completo

### 1. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:8082`

### 2. Abrir a página de configuração do Meta

1. Navegue até: `http://localhost:8082/meta-ads-config`
2. Faça login se necessário
3. Na sidebar direita, clique em **"Debug" → "Mostrar"**

### 3. Verificar configuração no painel de debug

Verifique se:
- ✅ **Meta App ID**: Deve ser `336112808735379`
- ✅ **Environment**: `development`
- ✅ **Redirect URI**: `http://localhost:8082/meta-ads-config`
- ✅ **Supabase URL**: Deve estar preenchido

Se algum valor estiver errado, verifique o arquivo `.env`

### 4. Iniciar o fluxo OAuth

1. Clique em **"Conectar com Meta Business"**
2. Será aberto um popup/modal de confirmação
3. Clique em **"Continuar"**
4. Você será redirecionado para o Facebook/Meta

### 5. Autorizar no Meta

1. **Faça login** com sua conta do Facebook (se não estiver logado)
2. **Selecione o Business Manager** (se tiver mais de um)
3. **Revise as permissões** solicitadas:
   - Gerenciar anúncios e campanhas
   - Acessar métricas de performance
   - Visualizar contas publicitárias
   - Gerenciar Business Manager
4. Clique em **"Continuar"** ou **"Autorizar"**

### 6. Callback e verificação

Após autorizar, você será redirecionado de volta para:
```
http://localhost:8082/meta-ads-config?code=XXXXX&state=XXXXX
```

**O que deve acontecer:**

✅ **Sucesso:**
- A página limpa os parâmetros da URL
- Aparece um toast de sucesso
- O status muda para "Conectado"
- As contas publicitárias aparecem na lista
- No painel de debug, "Connections" > 0

❌ **Erro 400:**
- Aparece um erro no console
- Um toast vermelho com a mensagem de erro
- No painel de debug, aparece "Último erro"

### 7. Verificar logs no console do navegador

Abra o **DevTools** (F12) e vá para a aba **Console**.

**Logs de sucesso:**
```
🔄 Exchanging code with redirect_uri: http://localhost:8082/meta-ads-config
📥 Response from meta-auth: { data: { success: true, ... }, error: null }
✅ Successfully connected to Meta Business
```

**Logs de erro:**
```
🔄 Exchanging code with redirect_uri: http://localhost:8082/meta-ads-config
❌ Supabase function error: FunctionsHttpError...
📋 Error details: { error: "..." }
```

## 🐛 Troubleshooting

### Erro: "Meta app credentials not configured"

**Solução:**
```bash
./scripts/setup-meta-secrets.sh
npx supabase functions deploy meta-auth
```

### Erro: "Invalid Meta App ID"

**Causa:** O App ID no Supabase não corresponde ao App real.

**Solução:**
1. Verifique o App ID no [Meta for Developers](https://developers.facebook.com/apps/336112808735379)
2. Atualize o secret:
   ```bash
   npx supabase secrets set META_APP_ID="336112808735379"
   npx supabase functions deploy meta-auth
   ```

### Erro: "redirect_uri mismatch"

**Causa:** O `redirect_uri` na requisição não corresponde ao configurado no Meta App.

**Solução:**
1. Vá para [Meta for Developers](https://developers.facebook.com/apps/336112808735379)
2. Settings → Basic → App Domains: adicione `localhost`
3. Facebook Login → Settings → Valid OAuth Redirect URIs: adicione `http://localhost:8082/meta-ads-config`

### Erro: "authorization code has been used"

**Causa:** React 18 StrictMode executa effects duas vezes em desenvolvimento.

**Solução:** Esse erro é tratado automaticamente. Se continuar vendo, recarregue a página.

### Erro 400 genérico

**Debugging:**

1. **Veja os logs da Edge Function:**
   - Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy)
   - Edge Functions → meta-auth → Logs
   - Procure pelo log mais recente com `action: exchange_code`

2. **Teste manualmente o token exchange:**
   ```bash
   # Pegue o código da URL após autorizar
   CODE="AQxxx..."

   curl -X POST "https://graph.facebook.com/v24.0/oauth/access_token" \
     -d "client_id=336112808735379" \
     -d "client_secret=SEU_SECRET" \
     -d "redirect_uri=http://localhost:8082/meta-ads-config" \
     -d "code=$CODE"
   ```

3. **Verifique se você é tester do App:**
   - [Meta App → App Roles → Roles](https://developers.facebook.com/apps/336112808735379/roles/roles/)
   - Adicione seu usuário como **Tester** ou **Developer**

## 📊 Verificar dados no banco

Após conexão bem-sucedida:

```bash
# Conectar ao banco Supabase
npx supabase db connect

# Verificar conexões
SELECT * FROM meta_business_connections WHERE is_active = true;

# Verificar contas publicitárias
SELECT * FROM ad_accounts WHERE provider = 'meta';
```

## 📚 Documentação adicional

- [docs/META_OAUTH_TROUBLESHOOTING.md](./META_OAUTH_TROUBLESHOOTING.md) - Guia completo de troubleshooting
- [docs/META_VERIFICATION_GUIDE.md](./META_VERIFICATION_GUIDE.md) - Verificação de credenciais
- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)

## 🎯 Checklist Final

Antes de reportar um erro, verifique:

- [ ] Secrets configurados no Supabase (`npx supabase secrets list | grep META`)
- [ ] Edge Function deployada (`npx supabase functions deploy meta-auth`)
- [ ] `.env` contém `VITE_META_REDIRECT_URI`
- [ ] Redirect URI configurado no Meta for Developers
- [ ] Você é tester/developer do App Meta
- [ ] App está em modo Development (não precisa de aprovação)
- [ ] Console do navegador mostra logs detalhados
- [ ] Painel de debug na página mostra configuração correta
