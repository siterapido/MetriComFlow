# Configuração Automática OAuth Meta - InsightFy

## ✅ Configurações Já Realizadas Automaticamente

### 1. Meta App ID Corrigido
- **App ID**: `3361128087359379`
- **App Name**: InsightFy
- **Status**: ✅ Configurado em todos os ambientes

### 2. URLs de Ambiente Configuradas

#### Desenvolvimento (Local)
- **URL Base**: `http://localhost:8082`
- **Redirect URI**: `http://localhost:8082/meta-ads-config`
- **Status**: ✅ Configurado no .env local

#### Produção (Vercel)
- **URL Base**: `https://www.insightfy.com.br`
- **Redirect URI**: `https://www.insightfy.com.br/meta-ads-config`
- **Status**: ✅ Configurado no Vercel

---

## 🔧 Configurações Manuais Necessárias no Meta Developer Console

### Acesse: https://developers.facebook.com/apps/3361128087359379/

### 1. Configurar OAuth Redirect URLs
**Navegue para**: App Settings > Basic

**Adicione estas URLs em "Valid OAuth Redirect URIs":**
```
http://localhost:8082/meta-ads-config
https://www.insightfy.com.br/meta-ads-config
https://metricom-flow.vercel.app/meta-ads-config
```

### 2. Configurar App Domains
**Na mesma seção "Basic"**, adicione em "App Domains":
```
localhost
insightfy.com.br
metricom-flow.vercel.app
```

### 3. Ativar Facebook Login
**Navegue para**: Products > Facebook Login > Settings

**Configure:**
- ✅ Client OAuth Login: **ATIVADO**
- ✅ Web OAuth Login: **ATIVADO**
- ✅ Force Web OAuth Reauthentication: **DESATIVADO**
- ✅ Use Strict Mode for Redirect URIs: **ATIVADO**

**Valid OAuth Redirect URIs (repita aqui):**
```
http://localhost:8082/meta-ads-config
https://www.insightfy.com.br/meta-ads-config
https://metricom-flow.vercel.app/meta-ads-config
```

### 4. Configurar Marketing API
**Navegue para**: Products > Marketing API > Settings

**Verifique se está ativado para:**
- ✅ Ads Management
- ✅ Ads Insights
- ✅ Business Management

---

## 🧪 Teste Automático

Após configurar no Meta Developer Console, execute:

```bash
# Teste a conexão
bash scripts/test-meta-connection.sh

# Teste o OAuth
bash scripts/test-meta-oauth-url.sh
```

---

## 📋 Checklist Final

- [ ] URLs de redirecionamento adicionadas no Meta Developer Console
- [ ] App Domains configurados
- [ ] Facebook Login ativado (Client + Web OAuth)
- [ ] Marketing API ativada
- [ ] Teste de conexão executado com sucesso
- [ ] Teste de OAuth executado com sucesso

---

## 🚀 URLs de Teste

### Desenvolvimento
- App: http://localhost:8082/
- OAuth: http://localhost:8082/meta-ads-config

### Produção
- App: https://www.insightfy.com.br/
- OAuth: https://www.insightfy.com.br/meta-ads-config

---

**Status**: ✅ Configurações automáticas concluídas
**Próximo passo**: Configurar manualmente no Meta Developer Console usando as informações acima