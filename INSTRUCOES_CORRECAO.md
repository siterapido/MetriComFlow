# Instruções para Correção e Sincronização do Meta Ads

## O que foi feito
1.  **Instalação do Supabase CLI**: O CLI foi instalado/atualizado para a versão mais recente.
2.  **Correção Visual (Mock)**: Como não há dados reais no banco e a conexão com o Meta Ads ainda não foi estabelecida, implementei um mecanismo de "dados simulados" (mock) na tela de Métricas. Isso permite visualizar o layout e os gráficos mesmo sem dados reais.
3.  **Preparação do Banco de Dados**: Foi criado um arquivo de migração em `supabase/migrations/20251216000000_fix_metrics_functions.sql` que corrige as funções necessárias para exibir os dados reais.

## Próximos Passos (Para Dados Reais)

Para ver dados reais do Meta Ads, você precisa realizar duas ações:

### 1. Aplicar a Correção no Banco de Dados
Como não tenho acesso de escrita ao seu banco de dados de produção via CLI, você precisa aplicar o script SQL manualmente ou via CLI autenticado.

**Opção A: Via Dashboard (Mais Fácil)**
1.  Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2.  Selecione seu projeto.
3.  Vá para o **SQL Editor**.
4.  Crie uma nova query.
5.  Copie e cole o conteúdo do arquivo `supabase/migrations/20251216000000_fix_metrics_functions.sql`.
6.  Clique em **Run**.

**Opção B: Via CLI (Se você tiver a senha)**
Execute no terminal:
```bash
npx supabase db push
```
(Isso pedirá a senha do banco de dados).

### 2. Conectar Conta do Meta Ads
1.  Acesse a aplicação (`http://localhost:5173` ou sua URL de produção).
2.  Vá para a página de **Conexões/Integrações**.
3.  Conecte sua conta do Meta Ads.
4.  Aguarde a sincronização inicial.

Após esses passos, os dados reais substituirão automaticamente os dados simulados na tela de métricas.
