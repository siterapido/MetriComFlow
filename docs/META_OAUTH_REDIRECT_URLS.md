# Configuração de URLs de Redirecionamento do Meta OAuth

## Problema Comum

Ao tentar conectar com Meta Business, você pode ver este erro:

```
URL bloqueada
O redirecionamento falhou porque o URl usado não está na lista de liberação
nas configurações de OAuth do cliente do app.
```

## Solução

As URLs de redirecionamento OAuth devem ser configuradas no Meta for Developers.

## Passo a Passo

### 1. Acesse o Meta for Developers

**App:** InsightFy
**App ID:** 3361128087359379
**URL:** https://developers.facebook.com/apps/3361128087359379/

### 2. Navegue até Configurações de Login

**Caminho:**
1. Painel lateral → **"Casos de uso"** (Use cases)
2. Procure **"Autenticação e Recuperação de Conta"** (Authentication and account recovery)
3. Clique em **"Configurar"** ou **"Personalizar"** (Customize)
4. Role até **"Configurações"** (Settings)

**OU caminho alternativo:**
1. Painel lateral → **"Produtos"** (Products)
2. Clique em **"Login do Facebook"** (Facebook Login)
3. Clique em **"Configurações"** (Settings)

### 3. Adicione URLs de Redirecionamento OAuth

**Campo:** "URLs válidos de redirecionamento de OAuth" (Valid OAuth Redirect URIs)

**URLs para adicionar:**

```
http://localhost:8082/meta-ads-config
https://www.insightfy.com.br/meta-ads-config
https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config
```

**Formato:**
- Uma URL por linha
- Sem barra `/` no final
- `http://` para localhost (não `https://`)
- `https://` para produção

### 4. Configurações Adicionais Necessárias

Na mesma página de **Login do Facebook**, verifique:

#### Login de OAuth do Cliente (Client OAuth Login)
- ✅ **Deve estar:** Ativado (Yes)
- Se desativado, ative e salve

#### Login de OAuth da Web (Web OAuth Login)
- ✅ **Deve estar:** Ativado (Yes)
- Se desativado, ative e salve

#### Domínios do App (App Domains)
Na seção **"Configurações básicas"** (Basic Settings):
```
localhost
www.insightfy.com.br
insightfy.com.br
metri-com-flow-mafcos-projects-ca629a4f.vercel.app
```

### 5. Salvar Alterações

**IMPORTANTE:** Clique em **"Salvar alterações"** (Save changes) no final da página!

## Verificação Rápida

Após configurar, teste com este checklist:

- [ ] URLs de redirecionamento adicionadas
- [ ] Login de OAuth do Cliente: ✅ Ativado
- [ ] Login de OAuth da Web: ✅ Ativado
- [ ] Domínios do app configurados
- [ ] Alterações salvas
- [ ] Aguardou 1-2 minutos para propagação
- [ ] Testou no navegador

## Teste Manual

### Teste em Desenvolvimento (localhost)

1. Acesse: http://localhost:8082/meta-ads-config
2. Clique em "Conectar Meta Business"
3. **Esperado:** Redirecionar para facebook.com com tela de permissões
4. **Erro:** "URL bloqueada" → URLs não configuradas corretamente

### Teste em Produção (Vercel)

1. Acesse: https://www.insightfy.com.br/meta-ads-config
2. Clique em "Conectar Meta Business"
3. **Esperado:** Redirecionar para facebook.com com tela de permissões
4. **Erro:** "URL bloqueada" → URLs não configuradas corretamente

## URLs Completas de Configuração

### Meta for Developers

| Configuração | URL |
|-------------|-----|
| Dashboard Principal | https://developers.facebook.com/apps/3361128087359379/ |
| Configurações Básicas | https://developers.facebook.com/apps/3361128087359379/settings/basic/ |
| Login do Facebook | https://developers.facebook.com/apps/3361128087359379/fb-login/settings/ |
| Casos de Uso | https://developers.facebook.com/apps/3361128087359379/use_cases/ |

### Aplicação

| Ambiente | URL de Redirecionamento OAuth |
|----------|-------------------------------|
| Desenvolvimento (local) | http://localhost:8082/meta-ads-config |
| Produção (domínio principal) | https://www.insightfy.com.br/meta-ads-config |
| Produção (domínio Vercel) | https://metri-com-flow-mafcos-projects-ca629a4f.vercel.app/meta-ads-config |

## Modo do App

### Desenvolvimento (Development Mode)

**Quando usar:**
- Durante desenvolvimento local
- Para testes com contas de teste
- Antes do lançamento público

**Características:**
- Apenas usuários com função no app podem autenticar
- Funções disponíveis: Administrador, Desenvolvedor, Testador
- Sem limite de API reduzido

**Como adicionar testadores:**
1. Vá em **"Funções"** (Roles) no menu lateral
2. Clique em **"Testadores"** (Testers)
3. Adicione usuários pelo Facebook ID ou email
4. Eles receberão um convite

### Produção (Live Mode)

**Requisitos antes de ativar:**
- App revisado e aprovado pela Meta
- URLs de produção configuradas
- Política de privacidade URL configurada
- Termos de serviço configurados

**Características:**
- Qualquer usuário do Facebook pode autenticar
- Requer revisão de permissões (App Review)
- Limite de API de produção

## Permissões Necessárias

Para o funcionamento do InsightFy/MetriCom Flow, estas permissões são necessárias:

### Permissões Básicas (sem revisão)
- `public_profile` - Perfil público do usuário
- `email` - Email do usuário

### Permissões Avançadas (requer App Review)
- `ads_management` - Gerenciar campanhas de anúncios
- `ads_read` - Ler métricas de anúncios
- `business_management` - Gerenciar Business Manager
- `leads_retrieval` - Recuperar leads de anúncios (opcional)

## Troubleshooting

### Erro: "URL bloqueada"
**Causa:** URL não está na lista de redirecionamento OAuth
**Solução:** Adicione a URL exata na configuração do Meta app

### Erro: "redirect_uri_mismatch"
**Causa:** URL enviada pelo código não coincide com a configurada
**Solução:** Verifique se a URL no código é exatamente igual à configurada

### Erro: "App Not Setup"
**Causa:** Login do Facebook não está ativado no app
**Solução:** Ative Login do Facebook em Produtos

### Erro: "Unauthorized"
**Causa:** Usuário não tem permissão para usar o app em modo Development
**Solução:** Adicione o usuário como Testador em Funções

## Código de Referência

### Client (.env)
```env
VITE_META_REDIRECT_URI="http://localhost:8082/meta-ads-config"
```

### Edge Function (meta-auth)
```typescript
const authUrl = `${baseUrl}?${params.toString()}`;
// redirect_uri será: http://localhost:8082/meta-ads-config
```

### Callback Flow
```
1. Usuário clica "Conectar Meta Business"
   ↓
2. Edge Function gera URL:
   https://www.facebook.com/v24.0/dialog/oauth?
     client_id=3361128087359379&
     redirect_uri=http://localhost:8082/meta-ads-config&
     scope=ads_management,ads_read,business_management&
     response_type=code&
     state=USER_ID
   ↓
3. Meta valida redirect_uri contra lista configurada
   ↓
4. Se válida: mostra tela de permissões
   Se inválida: mostra "URL bloqueada"
   ↓
5. Após autorização, redireciona de volta:
   http://localhost:8082/meta-ads-config?code=XXXXX&state=USER_ID
   ↓
6. App troca code por access_token via Edge Function
```

## Referências

- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/)
- [Meta App Dashboard](https://developers.facebook.com/apps/)
- [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)
