# Configuração do App Meta for Developers

Este guia explica como criar e configurar um app no Meta for Developers para integração com o sistema de leads.

## 1. Criando o App Meta

### Passo 1: Acesse o Meta for Developers
1. Vá para [developers.facebook.com](https://developers.facebook.com)
2. Faça login com sua conta Meta/Facebook
3. Clique em "Meus Apps" no menu superior

### Passo 2: Criar Novo App
1. Clique em "Criar App"
2. Selecione "Empresa" como tipo de app
3. Preencha as informações:
   - **Nome do App**: Nome da sua aplicação (ex: "Metricom Flow")
   - **Email de Contato**: Seu email de contato
   - **Finalidade**: Selecione "Você mesmo ou sua própria empresa"

### Passo 3: Configurar Produtos
Após criar o app, adicione os seguintes produtos:

#### Facebook Login
1. No painel do app, clique em "Adicionar Produto"
2. Encontre "Facebook Login" e clique em "Configurar"
3. Selecione "Web" como plataforma
4. Configure as URLs:
   - **URL do Site**: `http://localhost:8081` (desenvolvimento)
   - **URLs de Redirecionamento OAuth Válidas**: 
     ```
     http://localhost:8081/meta-ads-config
     https://seudominio.com/meta-ads-config
     ```

#### Marketing API
1. Adicione o produto "Marketing API"
2. Este produto permite acesso aos dados de anúncios

## 2. Configurar Permissões

### Permissões Necessárias
No painel do app, vá para "Permissões e Recursos" e solicite:

- `ads_read` - Ler dados de anúncios
- `pages_manage_ads` - Gerenciar anúncios de páginas
- `leads_retrieval` - Recuperar leads
- `business_management` - Gerenciar negócios

### Processo de Aprovação
- Algumas permissões requerem aprovação do Meta
- Preencha o formulário de revisão com detalhes sobre como você usará os dados
- O processo pode levar alguns dias

## 3. Obter Credenciais

### App ID e App Secret
1. No painel do app, vá para "Configurações" > "Básico"
2. Copie o **ID do App** e o **Chave Secreta do App**
3. **IMPORTANTE**: Mantenha a chave secreta segura e nunca a exponha publicamente

## 4. Configurar no Sistema

### Atualizar Credenciais no Supabase
Execute os seguintes comandos SQL no Supabase:

```sql
-- Atualizar o ID do App Meta
SELECT vault.update_secret('META_APP_ID', 'SEU_APP_ID_AQUI');

-- Atualizar a Chave Secreta do App Meta
SELECT vault.update_secret('META_APP_SECRET', 'SUA_CHAVE_SECRETA_AQUI');
```

### Verificar Configuração
Após atualizar as credenciais:
1. Acesse a página de configuração Meta Ads no sistema
2. Clique em "Conectar com Meta Business Manager"
3. Você deve ser redirecionado para a página de autorização do Meta

## 5. Configurações de Produção

### URLs de Produção
Quando for para produção, atualize:

1. **No Meta for Developers**:
   - URL do Site: `https://seudominio.com`
   - URLs de Redirecionamento: `https://seudominio.com/meta-ads-config`

2. **Domínios do App**:
   - Adicione seu domínio de produção na seção "Domínios do App"

### Modo de Desenvolvimento vs Produção
- **Desenvolvimento**: O app funciona apenas para usuários com função de desenvolvedor
- **Produção**: Após aprovação, o app funciona para todos os usuários

## 6. Solução de Problemas

### Erro: Invalid App ID
- Verifique se o App ID está correto
- Confirme que as credenciais foram atualizadas no Supabase Vault
- Certifique-se de que o app não foi excluído ou suspenso

### Erro: Invalid Redirect URI
- Verifique se a URL de redirecionamento está configurada corretamente no Meta
- Confirme que a URL corresponde exatamente (incluindo protocolo e porta)

### Erro: Insufficient Permissions
- Verifique se todas as permissões necessárias foram solicitadas
- Aguarde a aprovação das permissões que requerem revisão

## 7. Recursos Úteis

- [Documentação Meta for Developers](https://developers.facebook.com/docs/)
- [Marketing API Documentation](https://developers.facebook.com/docs/marketing-api/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [App Review Process](https://developers.facebook.com/docs/app-review/)

## 8. Checklist de Configuração

- [ ] App criado no Meta for Developers
- [ ] Facebook Login configurado
- [ ] Marketing API adicionada
- [ ] URLs de redirecionamento configuradas
- [ ] Permissões solicitadas
- [ ] App ID e App Secret obtidos
- [ ] Credenciais atualizadas no Supabase Vault
- [ ] Teste de conexão realizado
- [ ] Configurações de produção definidas (quando aplicável)