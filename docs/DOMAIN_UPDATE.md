# Atualização de Domínio - www.insightfy.com.br

## 📅 Data da Atualização
**27 de Outubro de 2025**

## 🌐 Novo Domínio

**Domínio de Produção**: `www.insightfy.com.br`

### URLs Configuradas

| Ambiente | URL Base | Meta OAuth Redirect |
|----------|----------|---------------------|
| **Produção** | `https://www.insightfy.com.br` | `https://www.insightfy.com.br/meta-ads-config` |
| **Desenvolvimento** | `http://localhost:8082` | `http://localhost:8082/meta-ads-config` |

## ✅ Atualizações Realizadas

### 1. Variáveis de Ambiente no Vercel ✅

Variáveis atualizadas automaticamente via script:

```bash
VITE_APP_URL=https://www.insightfy.com.br
VITE_META_REDIRECT_URI=https://www.insightfy.com.br/meta-ads-config
```

**Status**: ✅ Configurado (criado há 31s)

### 2. Script de Atualização ✅

Arquivo: [scripts/update-meta-oauth-urls.sh](../scripts/update-meta-oauth-urls.sh)

Atualizado para usar o novo domínio `www.insightfy.com.br`

### 3. Documentação ✅

Arquivo: [docs/META_OAUTH_FIX.md](./META_OAUTH_FIX.md)

Todas as referências atualizadas para o novo domínio.

## 🔧 Configuração Necessária no Meta Developer Console

### ⚠️ Ação Manual Requerida

**URL**: https://developers.facebook.com/apps/3361128087359379/settings/basic/

**Passos:**

1. Acesse o link acima
2. Faça login com a conta do Meta Developer
3. Role até a seção **"URIs de redirecionamento OAuth válidos"**
4. Adicione as seguintes URLs (uma por linha):

```
https://www.insightfy.com.br/meta-ads-config
http://localhost:8082/meta-ads-config
```

5. **IMPORTANTE**: Role até o final da página e clique em **"Salvar alterações"**
6. Aguarde 2-5 minutos para propagação

### Verificação

Após salvar no Meta Developer Console, verifique se as URLs estão listadas:
- ✅ `https://www.insightfy.com.br/meta-ads-config`
- ✅ `http://localhost:8082/meta-ads-config`

## 🚀 Deploy Necessário

Para aplicar as novas variáveis de ambiente:

```bash
vercel --prod
```

**Status**: ⏳ Aguardando deploy

## 📊 Checklist de Validação

### Pré-Deploy
- [x] Variáveis de ambiente atualizadas no Vercel
- [x] Script atualizado com novo domínio
- [x] Documentação atualizada
- [ ] URLs configuradas no Meta Developer Console

### Pós-Deploy
- [ ] Deploy realizado no Vercel
- [ ] Teste de OAuth em produção (`www.insightfy.com.br`)
- [ ] Teste de OAuth em desenvolvimento (`localhost:8082`)
- [ ] Verificar logs do Edge Function `meta-auth`
- [ ] Confirmar sincronização de Ad Accounts

## 🧪 Como Testar

### 1. Teste em Produção

```bash
# 1. Acesse a aplicação
open https://www.insightfy.com.br

# 2. Faça login
# 3. Vá para "Meta Ads Config"
# 4. Clique em "Conectar Meta Business"
# 5. Autorize no Meta
# 6. Deve retornar para www.insightfy.com.br/meta-ads-config com sucesso
```

### 2. Teste em Desenvolvimento

```bash
# 1. Inicie o servidor local
npm run dev

# 2. Acesse http://localhost:8082
# 3. Faça login
# 4. Vá para "Meta Ads Config"
# 5. Clique em "Conectar Meta Business"
# 6. Autorize no Meta
# 7. Deve retornar para localhost:8082/meta-ads-config com sucesso
```

### 3. Verificar Logs

```bash
# Logs do Edge Function
npx supabase functions logs meta-auth --project-id fjoaliipjfcnokermkhy

# Deve mostrar:
# ✅ Using correct App ID: InsightFy
# redirect_uri = https://www.insightfy.com.br/meta-ads-config
```

## 🔍 Troubleshooting

### Erro: "URL bloqueada"

**Causa**: URL não está no Meta Developer Console

**Solução**:
1. Verifique se `https://www.insightfy.com.br/meta-ads-config` está na lista
2. Aguarde 5 minutos após salvar
3. Limpe cache do navegador
4. Tente novamente

### Erro: "Invalid authorization code"

**Causa**: Code OAuth expirou

**Solução**:
1. Recarregue a página
2. Inicie o fluxo OAuth novamente
3. Não use o botão "voltar" durante o OAuth

### Erro: Redirecionamento para URL antiga

**Causa**: Deploy não foi feito ou cache do navegador

**Solução**:
1. Confirme que fez deploy: `vercel --prod`
2. Limpe cache do navegador (Cmd+Shift+R no Chrome)
3. Tente em janela anônima
4. Verifique variáveis: `vercel env ls production`

## 📝 Histórico de Domínios

| Data | Domínio | Status |
|------|---------|--------|
| Out 2025 | `metri-com-flow-b2jhesmmi-mafcos-projects-ca629a4f.vercel.app` | ❌ Depreciado |
| 27 Out 2025 | `www.insightfy.com.br` | ✅ Atual |

## 🔗 Links Importantes

- **Aplicação (Produção)**: https://www.insightfy.com.br
- **Meta Developer Console**: https://developers.facebook.com/apps/3361128087359379
- **Vercel Dashboard**: https://vercel.com/mafcos-projects-ca629a4f/metri-com-flow
- **Supabase Dashboard**: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy

## 📚 Documentação Relacionada

- [META_OAUTH_FIX.md](./META_OAUTH_FIX.md) - Guia completo de OAuth
- [META_OAUTH_SETUP.md](./META_OAUTH_SETUP.md) - Setup inicial do Meta OAuth
- [CLAUDE.md](../CLAUDE.md) - Documentação do projeto

## 💡 Notas

- O domínio `www.insightfy.com.br` deve estar configurado no Vercel
- DNS deve estar apontando corretamente
- Certificado SSL deve estar ativo (Vercel gerencia automaticamente)
- Todas as variáveis de ambiente sensíveis devem estar em "Production" apenas

## 🎯 Próxima Ação

**Agora você deve:**

1. ✅ Configurar URLs no Meta Developer Console (manual)
2. ✅ Fazer deploy: `vercel --prod`
3. ✅ Testar OAuth em produção
4. ✅ Confirmar funcionamento completo
