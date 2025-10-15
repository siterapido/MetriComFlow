# Configuração Meta Ads

## Visão Geral

A funcionalidade Meta Ads permite aos usuários conectar suas contas do Meta Business Manager ao sistema MetriCom Flow para gerenciar campanhas publicitárias.

## Funcionalidades Implementadas

### 1. Autenticação OAuth com Meta Business Manager
- Conexão segura via OAuth 2.0
- Armazenamento de tokens de acesso
- Renovação automática de tokens

### 2. Interface de Configuração
- Página dedicada em `/meta-ads-config`
- Status visual das conexões
- Gerenciamento de contas de anúncios

### 3. Banco de Dados
- Tabela `meta_business_connections` para armazenar conexões
- Políticas RLS (Row Level Security) implementadas
- Trigger para atualização automática de timestamps

## Estrutura de Arquivos

```
src/
├── pages/MetaAdsConfig.tsx          # Página principal de configuração
├── hooks/useMetaAuth.ts             # Hook para gerenciar autenticação Meta
└── lib/database.types.ts            # Tipos TypeScript do banco

supabase/
├── functions/meta-auth/index.ts     # Edge Function para OAuth
└── migrations/                      # Migrações do banco de dados
```

## Como Usar

### 1. Acessar a Configuração
1. Faça login no sistema
2. Navegue para "Meta Ads Config" no menu lateral
3. Clique em "Conectar com Meta Business"

### 2. Processo de Conexão
1. O sistema redirecionará para o Meta Business Manager
2. Autorize o acesso às suas contas de anúncios
3. Você será redirecionado de volta ao sistema
4. As contas conectadas aparecerão na interface

### 3. Gerenciar Conexões
- Visualize todas as contas conectadas
- Desconecte contas quando necessário
- Monitore o status das conexões

## Configuração Técnica

### Variáveis de Ambiente Necessárias

```env
# Meta App Configuration
VITE_META_APP_ID=your_meta_app_id
VITE_META_APP_SECRET=your_meta_app_secret
VITE_META_REDIRECT_URI=your_redirect_uri

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Configuração do Meta App
1. Acesse o [Meta for Developers](https://developers.facebook.com/)
2. Crie um novo app ou use um existente
3. Configure as permissões necessárias:
   - `ads_management`
   - `ads_read`
   - `business_management`
4. Adicione o redirect URI do seu domínio

## Segurança

- Tokens são armazenados de forma segura no Supabase
- RLS garante que usuários só acessem suas próprias conexões
- Comunicação via HTTPS obrigatória
- Tokens têm expiração automática

## Troubleshooting

### Erro de Conexão
- Verifique se as credenciais do Meta App estão corretas
- Confirme se o redirect URI está configurado corretamente
- Verifique se as permissões necessárias foram concedidas

### Problemas de Token
- Tokens expiram automaticamente
- O sistema tentará renovar tokens automaticamente
- Em caso de falha, reconecte a conta

## Próximos Passos

- [ ] Implementar sincronização de campanhas
- [ ] Adicionar métricas de performance
- [ ] Criar relatórios automatizados
- [ ] Implementar webhooks para atualizações em tempo real