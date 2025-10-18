# Guia de Verificação - Meta Business Suite

Este guia ajuda a diagnosticar e resolver problemas de integração com o Meta Business Suite, especialmente o erro `PLATFORM__INVALID_APP_ID`.

## 🔍 Diagnóstico Rápido

### 1. Verificar App ID no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/)
2. Localize seu app (ID: `336125808735379`)
3. Verifique se o app está **ativo** e não foi **suspenso**
4. Confirme se o App ID está correto

### 2. Verificar Configurações do App

#### Configurações Básicas
- **App Domain**: Deve incluir seu domínio de produção
- **Site URL**: Deve apontar para sua URL de produção
- **Valid OAuth Redirect URIs**: Deve incluir:
  - `https://seu-dominio.com/meta-ads-config`
  - `https://seu-dominio-vercel.vercel.app/meta-ads-config`

#### Produtos Habilitados
- ✅ **Facebook Login** deve estar configurado
- ✅ **Marketing API** deve estar habilitada
- ✅ **Business Manager API** deve estar habilitada

### 3. Verificar Variáveis de Ambiente

#### Desenvolvimento (.env)
```bash
VITE_META_APP_ID=336125808735379
VITE_META_APP_SECRET=b31efec7d5ba6ba51483bd12c4ba05a
VITE_META_REDIRECT_URI=http://localhost:5173/meta-ads-config
VITE_APP_URL=http://localhost:5173
```

#### Produção (Vercel)
```bash
META_APP_ID=336125808735379
META_APP_SECRET=b31efec7d5ba6ba51483bd12c4ba05a
```

#### Supabase Vault
```sql
-- Verificar secrets no Supabase
SELECT name, secret FROM vault.decrypted_secrets 
WHERE name IN ('META_APP_ID', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN', 'META_PAGE_ACCESS_TOKEN', 'META_ACCESS_TOKEN');
```

## 📣 Webhook de Lead Ads (Meta)

Para receber leads via Webhook com segurança, garanta estas configurações:

1. Secrets necessários no Supabase Vault:
   - `META_APP_SECRET`: usado para validar a assinatura do webhook
   - `META_WEBHOOK_VERIFY_TOKEN`: token de verificação para o desafio (GET)
   - `META_PAGE_ACCESS_TOKEN` ou `META_ACCESS_TOKEN`: token com permissão para obter os detalhes do lead (`leadgen_id`)

2. Verificação do Webhook
   - GET: o Meta enviará `hub.mode=subscribe`, `hub.verify_token` e `hub.challenge`
   - O serviço deve validar se `hub.verify_token === META_WEBHOOK_VERIFY_TOKEN` e retornar `hub.challenge`

3. Assinatura do Webhook (POST)
   - O Meta envia o cabeçalho `X-Hub-Signature-256: sha256=<assinatura_hex>` (preferível) ou `X-Hub-Signature: sha1=<assinatura_hex>`
   - A assinatura é calculada com HMAC do corpo bruto (raw body) usando o `META_APP_SECRET`
   - O nosso Edge Function `webhook-lead-ads` valida a assinatura ANTES de parsear o JSON

Exemplo (Node.js) de como calcular a assinatura sha256 para testes locais:
```js
const crypto = require('crypto');
function calcSignature256(appSecret, rawBody) {
  return crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
}
```

4. Endpoint do Webhook
   - URL de produção: `https://<SEU-PROJETO>.supabase.co/functions/v1/webhook-lead-ads`
   - Configure no produto "Webhooks" do Meta (Página/Formulário de Leads)
   - Teste com o simulador de Webhooks do Meta ou via `curl`

## 🛠️ Comandos de Verificação

### 1. Testar Edge Function Localmente
```bash
# Navegar para o diretório da função
cd supabase/functions/meta-auth

# Executar localmente
supabase functions serve meta-auth --env-file .env
```

### 2. Verificar Logs do Supabase
```bash
# Ver logs da Edge Function
supabase functions logs meta-auth
supabase functions logs webhook-lead-ads
```

### 3. Testar OAuth Flow
```bash
# Fazer requisição para obter URL de autenticação
curl -X POST https://seu-projeto.supabase.co/functions/v1/meta-auth \
  -H "Content-Type: application/json" \
  -d '{"action": "get_auth_url"}'
```

## 🚨 Erros Comuns e Soluções

### `PLATFORM__INVALID_APP_ID`
**Causa**: App ID inválido ou app suspenso no Meta
**Solução**:
1. Verificar se o App ID `336125808735379` existe no Meta for Developers
2. Confirmar se o app não foi suspenso
3. Verificar se as variáveis de ambiente estão corretas

### `Invalid Redirect URI`
**Causa**: URI de redirecionamento não configurada no Meta
**Solução**:
1. Adicionar URLs válidas no Meta for Developers
2. Verificar se a URL de produção está incluída

### `Insufficient Permissions`
**Causa**: Permissões insuficientes para acessar Business Manager
**Solução**:
1. Solicitar revisão do app no Meta
2. Verificar se todas as permissões necessárias foram aprovadas

## 📋 Checklist de Verificação

### Meta for Developers
- [ ] App ID `336125808735379` existe e está ativo
- [ ] App Domain inclui domínio de produção
- [ ] Valid OAuth Redirect URIs configuradas
- [ ] Facebook Login habilitado
- [ ] Marketing API habilitada
- [ ] Business Manager API habilitada

### Variáveis de Ambiente
- [ ] `META_APP_ID` configurado no Supabase Vault
- [ ] `META_APP_SECRET` configurado no Supabase Vault
- [ ] Variáveis de ambiente de produção no Vercel
- [ ] URLs de redirecionamento corretas

### Funcionalidade
- [ ] Edge Function `meta-auth` deployada
- [ ] OAuth flow funcionando em desenvolvimento
- [ ] OAuth flow funcionando em produção
- [ ] Logs sem erros no Supabase

## 🔧 Comandos de Manutenção

### Atualizar Secret no Supabase
```sql
-- Atualizar META_APP_SECRET
SELECT vault.update_secret(
  'META_APP_SECRET',
  'novo_secret_aqui'
);
```

### Redeployar Edge Function
```bash
# Deploy da função atualizada
supabase functions deploy meta-auth
supabase functions deploy webhook-lead-ads
```

### Verificar Status da Conexão
```sql
-- Verificar conexões ativas
SELECT 
  user_id,
  business_name,
  created_at,
  expires_at
FROM meta_business_connections 
WHERE expires_at > NOW();
```

## 📞 Suporte

Se o problema persistir após seguir este guia:

1. **Verificar logs detalhados** no Supabase Dashboard
2. **Testar em ambiente de desenvolvimento** primeiro
3. **Contactar suporte técnico** com:
   - App ID utilizado
   - Mensagem de erro completa
   - Logs relevantes
   - Passos já executados

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0