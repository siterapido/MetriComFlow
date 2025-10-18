# Guia de Configuração - Variáveis de Ambiente Vercel

Este guia detalha como configurar e verificar as variáveis de ambiente de produção no Vercel para o Meta Business Suite.

## 🔧 Variáveis Necessárias no Vercel

### Variáveis do Meta Business Suite
```bash
# Meta App Configuration
VITE_META_APP_ID=336125808735379
VITE_META_APP_SECRET=b31efec7d5ba6ba51483bd12c4ba05a

# Meta Redirect URI (produção)
VITE_META_REDIRECT_URI=https://seu-dominio.vercel.app/meta-ads-config

# App URL (produção)
VITE_APP_URL=https://seu-dominio.vercel.app
```

### Variáveis do Supabase
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Supabase Service Role (para Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### Variáveis do Ambiente
```bash
# Environment
VITE_VERCEL_ENV=production
NODE_ENV=production
```

## 📋 Checklist de Configuração

### 1. Configurar no Dashboard do Vercel
- [ ] Acessar [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Selecionar o projeto
- [ ] Ir para **Settings** → **Environment Variables**
- [ ] Adicionar todas as variáveis listadas acima

### 2. Configurar por Ambiente
```bash
# Production
VITE_META_REDIRECT_URI=https://seu-dominio.vercel.app/meta-ads-config
VITE_APP_URL=https://seu-dominio.vercel.app

# Preview (opcional)
VITE_META_REDIRECT_URI=https://preview-branch.vercel.app/meta-ads-config
VITE_APP_URL=https://preview-branch.vercel.app

# Development (local)
VITE_META_REDIRECT_URI=http://localhost:8080/meta-ads-config
VITE_APP_URL=http://localhost:8080
```

### 3. Verificar URLs no Meta for Developers
- [ ] Acessar [Meta for Developers](https://developers.facebook.com/apps/336125808735379)
- [ ] Ir para **Facebook Login** → **Settings**
- [ ] Adicionar URLs válidas em **Valid OAuth Redirect URIs**:
  - `https://seu-dominio.vercel.app/meta-ads-config`
  - `http://localhost:8080/meta-ads-config` (desenvolvimento)

## 🚀 Comandos de Verificação

### 1. Verificar Build Local
```bash
# Build de produção
npm run build

# Preview do build
npm run preview
```

### 2. Verificar Variáveis no Build
```bash
# Verificar se as variáveis estão sendo injetadas
grep -r "VITE_META_APP_ID" dist/
```

### 3. Testar Script de Verificação
```bash
# Executar verificação completa
npm run verify:meta
```

## 🔍 Diagnóstico de Problemas

### Problema: `PLATFORM__INVALID_APP_ID` em Produção

#### Possíveis Causas:
1. **Variável não configurada no Vercel**
   ```bash
   # Verificar se VITE_META_APP_ID está definida
   ```

2. **URL de redirecionamento incorreta**
   ```bash
   # Verificar se VITE_META_REDIRECT_URI aponta para domínio correto
   ```

3. **App ID não autorizado para domínio**
   - Verificar configurações no Meta for Developers
   - Confirmar se domínio está em **App Domains**

#### Soluções:
1. **Reconfigurar variáveis no Vercel**
2. **Fazer redeploy após mudanças**
3. **Verificar logs do Vercel**

### Verificar Logs do Vercel
```bash
# Via CLI do Vercel
vercel logs seu-projeto

# Ou acessar via Dashboard
# https://vercel.com/seu-usuario/seu-projeto/functions
```

## 🛠️ Comandos Úteis

### Deploy Manual
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Verificar variáveis
vercel env ls
```

### Verificar Build
```bash
# Build local com variáveis de produção
VITE_VERCEL_ENV=production npm run build

# Verificar se variáveis foram injetadas
cat dist/assets/index-*.js | grep -o "336125808735379"
```

## 📊 Monitoramento

### 1. Verificar Status da Aplicação
- [ ] Aplicação carrega corretamente
- [ ] Meta Business Suite conecta sem erros
- [ ] OAuth flow funciona em produção

### 2. Verificar Logs
- [ ] Logs do Vercel sem erros
- [ ] Logs do Supabase Edge Functions
- [ ] Console do navegador sem erros

### 3. Testar Funcionalidades
- [ ] Login com Meta funciona
- [ ] Conexão com Business Manager
- [ ] Sincronização de dados

## 🚨 Troubleshooting

### Erro: Variável não encontrada
```bash
# Verificar se variável está definida no Vercel
vercel env ls

# Adicionar variável
vercel env add VITE_META_APP_ID
```

### Erro: Build falha
```bash
# Verificar logs de build
vercel logs --follow

# Build local para debug
npm run build 2>&1 | tee build.log
```

### Erro: OAuth não funciona
1. Verificar URLs no Meta for Developers
2. Confirmar VITE_META_REDIRECT_URI
3. Testar em modo de desenvolvimento primeiro

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0