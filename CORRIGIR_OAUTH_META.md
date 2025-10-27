# 🚨 CORREÇÃO URGENTE: OAuth Meta Ads

## ⚡ Ação Imediata Necessária

O erro **"URL bloqueada"** acontece porque as URLs de redirecionamento OAuth **não estão configuradas no Meta Developer Console**.

---

## 📋 PASSO A PASSO (15 minutos)

### 1️⃣ Configurar Meta Developer Console (⚠️ AÇÃO MANUAL - MAIS IMPORTANTE)

**Acesse:** https://developers.facebook.com/apps/336112808735379/settings/basic/

**Localize a seção:** "URIs de redirecionamento OAuth válidos" (OAuth Redirect URIs)

**Adicione EXATAMENTE estas URLs:**
```
https://metri-com-flow.vercel.app/meta-ads-config
https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
http://localhost:8082/meta-ads-config
```

**⚠️ IMPORTANTE:**
- Cole EXATAMENTE como está acima
- NÃO coloque barra final (não use `/meta-ads-config/`)
- Clique em **"Salvar alterações"**

---

### 2️⃣ Atualizar Variáveis no Vercel (Automático)

Execute este script:

```bash
./scripts/update-vercel-meta-urls.sh
```

Ou manualmente:

```bash
# Atualizar VITE_APP_URL
vercel env rm VITE_APP_URL production --yes
echo "https://metri-com-flow.vercel.app" | vercel env add VITE_APP_URL production

# Atualizar VITE_META_REDIRECT_URI
vercel env rm VITE_META_REDIRECT_URI production --yes
echo "https://metri-com-flow.vercel.app/meta-ads-config" | vercel env add VITE_META_REDIRECT_URI production
```

---

### 3️⃣ Fazer Redeploy

```bash
vercel --prod
```

Aguarde o deploy completar (~1-2 minutos).

---

### 4️⃣ Testar

1. Acesse: https://metri-com-flow.vercel.app/meta-ads-config
2. Clique em **"Conectar Meta Business"**
3. Autorize no Meta
4. ✅ Deve redirecionar de volta sem erro!

---

## 🔍 URLs Importantes

### Produção (Vercel)
- **URL Principal:** https://metri-com-flow.vercel.app
- **Meta Ads Config:** https://metri-com-flow.vercel.app/meta-ads-config

### Meta Developer
- **Console:** https://developers.facebook.com/apps/336112808735379/
- **Configurações:** https://developers.facebook.com/apps/336112808735379/settings/basic/
- **App ID:** `336112808735379` (CRMads)

### Supabase
- **Project:** https://fjoaliipjfcnokermkhy.supabase.co
- **Functions:** https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/functions

---

## 📖 Documentação Completa

Para mais detalhes, consulte: [docs/META_OAUTH_SETUP.md](docs/META_OAUTH_SETUP.md)

---

## ❌ Se o erro persistir

### Erro: "URL bloqueada" ainda aparece

**Solução:**
1. Volte ao Meta Developer Console
2. Verifique se as URLs foram salvas corretamente
3. Aguarde 1-2 minutos (propagação)
4. Limpe cache do navegador (Ctrl+Shift+Delete)
5. Teste em janela anônima

### Erro: "Invalid application ID"

**Solução:**
```bash
# Atualizar App ID no Supabase
npx supabase secrets set META_APP_ID="336112808735379"

# Redeploy Edge Function
npx supabase functions deploy meta-auth
```

### Logs para Debug

```bash
# Supabase Edge Function
npx supabase functions logs meta-auth --project-ref fjoaliipjfcnokermkhy

# Vercel Production
vercel logs https://metri-com-flow.vercel.app
```

---

## ✅ Checklist Final

- [ ] URLs adicionadas no Meta Developer Console (seção OAuth)
- [ ] Alterações salvas no Meta Developer Console
- [ ] Variáveis VITE_APP_URL e VITE_META_REDIRECT_URI atualizadas no Vercel
- [ ] Redeploy feito no Vercel
- [ ] Testado OAuth em produção (https://metri-com-flow.vercel.app/meta-ads-config)
- [ ] OAuth funcionando sem erro "URL bloqueada"

---

**⏱ Tempo estimado:** 15 minutos
**🔴 Prioridade:** ALTA
**📝 Status:** Aguardando configuração manual no Meta Developer Console
