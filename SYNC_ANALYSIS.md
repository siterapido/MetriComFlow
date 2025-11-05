# Análise do Sistema de Sincronização

## 1. Visão Geral do Processo de Sincronização

O sistema de sincronização de dados da MetriCom é dividido em dois processos principais: um manual, acionado pelo frontend, e um automático, gerenciado por cron jobs no Supabase.

- **Processo Manual (Frontend-Driven):**
  - **Gatilho:** Ações do usuário na interface, como conectar uma conta do Meta ou solicitar a atualização de dados.
  - **Funções Envolvidas:** `sync-ad-accounts`, `sync-campaigns`, `sync-ad-sets`, `sync-ads`.
  - **Fluxo:** O frontend invoca Edge Functions específicas do Supabase para buscar dados sob demanda da API do Meta.

- **Processo Automático (Cron Jobs):**
  - **Gatilho:** Tarefas agendadas (`pg_cron`) que executam Edge Functions em intervalos predefinidos.
  - **Funções Envolvidas:** `sync-daily-insights` (a cada 3 horas), `sync-ad-sets-cron` (a cada 6 horas), `sync-ads-cron` (a cada 6 horas).
  - **Fluxo:** As funções buscam dados de performance e estrutura de campanhas para manter o sistema atualizado sem intervenção manual.

## 2. Métricas e Monitoramento

### 2.1. Frequência de Coleta

- **Insights Diários:** Coletados a cada 3 horas.
- **Estrutura (Contas, Campanhas, Ad Sets, Ads):** Sincronizados a cada 6 horas.

### 2.2. Lista de Métricas

#### Métricas do Meta Ads
- `spend`: Gasto
- `impressions`: Impressões
- `clicks`: Cliques
- `cpc`: Custo por Clique
- `cpm`: Custo por Mil Impressões
- `ctr`: Taxa de Cliques
- `frequency`: Frequência
- `reach`: Alcance
- `video_p25_watched_actions`: Visualizações de 25% do vídeo
- `video_p50_watched_actions`: Visualizações de 50% do vídeo
- `video_p75_watched_actions`: Visualizações de 75% do vídeo
- `video_p100_watched_actions`: Visualizações de 100% do vídeo
- `video_plays`: Reproduções de vídeo
- `actions:lead`: Leads (formulário nativo do Meta)
- `actions:onsite_conversion.post_save`: Conversões no site (salvamentos)

#### Métricas do CRM (Receita)
- `leads_count`: Contagem de leads importados.
- `total_revenue`: Receita total gerada.
- `avg_ticket`: Ticket médio.
- `conversion_rate`: Taxa de conversão (vendas / leads).

#### Métricas Unificadas (Cross-System)
- `cpl`: Custo por Lead (Gasto / Leads)
- `roas`: Retorno sobre o Gasto com Anúncios (Receita / Gasto)

### 2.3. Diagrama de Fluxo de Dados e Arquitetura

```mermaid
graph TD
    subgraph Frontend
        A[Dashboard] -->|Solicita Sincronização| B{Supabase Edge Functions};
    end

    subgraph Backend (Supabase)
        B -->|Chama API do Meta| C[Meta Graph API];
        C -->|Retorna Dados| B;
        B -->|Upsert| D[Banco de Dados Supabase];

        E[pg_cron] -->|Executa a cada 3h| F[sync-daily-insights];
        E -->|Executa a cada 6h| G[sync-ad-sets-cron];
        E -->|Executa a cada 6h| H[sync-ads-cron];

        F -->|Chama API do Meta| C;
        G -->|Chama API do Meta| C;
        H -->|Chama API do Meta| C;
    end

    subgraph Banco de Dados (Postgres)
        D -- lendo/escrevendo --> D;
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style E fill:#f96,stroke:#333,stroke-width:2px
```

### 2.4. Dependências Entre Componentes

- A sincronização de `ads` depende da sincronização de `ad_sets`.
- A sincronização de `ad_sets` depende da sincronização de `ad_campaigns`.
- A sincronização de `ad_campaigns` depende da sincronização de `ad_accounts`.
- A coleta de `daily_insights` depende da existência das campanhas no banco de dados.

## 3. Problemas Identificados e Impacto

### 3.1. Discrepância de Dados: Falha Silenciosa no Mapeamento de Campanhas

**Problema:** A função `sync-campaigns` falha silenciosamente ao tentar mapear o `account_id` (ID da conta de anúncios) para o `organization_id` da plataforma. Isso ocorre porque o `user_id` passado no corpo da requisição não é usado para buscar a organização correta, resultando em campanhas que não são associadas a nenhuma organização e, portanto, não aparecem no dashboard.

**Evidências e Análise Técnica:**

O `account_id` é extraído do `user`, mas o `user` é obtido do token de autenticação da requisição, e não do corpo (`body`) da requisição onde o `user_id` do cliente está.

```typescript
// supabase/functions/sync-campaigns/index.ts:60-63
const { data: { user } } = await supabase.auth.getUser();
// ...
const { data: adAccount, error: adAccountError } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, organization_id')
    .eq('external_id', accountId)
    .single();
```

- **Cenário de Falha:** Se um administrador (usuário A) tenta sincronizar as campanhas de um cliente (usuário B), a função busca a organização associada ao token do *administrador*, não do *cliente*. Se o `accountId` não pertence a nenhuma conta do administrador, `adAccount` retorna `null`, e a campanha é inserida com `organization_id = null`.

- **Tratamento de Erro Inadequado:** A API do Meta pode retornar erros (ex: permissões insuficientes, token expirado) que não são capturados de forma robusta. A função continua sua execução, resultando em um estado de "sucesso" parcial que mascara o problema subjacente.

- **Ausência de Monitoramento:** Não há alertas ou logs proativos para falhas de mapeamento ou erros da API, tornando o problema invisível até que um usuário reporte a ausência de dados.

- **Impacto Direto:**
    - **Integridade dos Dados:** Campanhas existem no banco de dados, mas não são visíveis para os usuários, gerando confusão e desconfiança na plataforma.
    - **Experiência do Usuário:** O usuário executa uma ação de sincronização e não recebe feedback do erro nem os dados esperados.
    - **Risco de Decisões Erradas:** Métricas e relatórios podem ser gerados com base em um conjunto incompleto de dados.

### 3.2. Risco de Baixa Performance no Frontend Devido a Cálculos no Cliente

**Problema:** A lógica de cálculo de métricas unificadas (como CPL e ROAS) e a agregação de dados de diferentes fontes (Meta Ads e CRM) são realizadas diretamente no frontend, em hooks e componentes React. Essa abordagem não escala e já apresenta lentidão.

**Evidências e Análise Técnica:**

O hook `useDashboard.ts` e componentes como `Dashboard.tsx` buscam dados brutos de múltiplas tabelas (`daily_insights`, `leads`) e realizam loops e agregações complexas no lado do cliente.

- **Complexidade no Cliente:** O cliente precisa baixar grandes volumes de dados e processá-los no navegador, consumindo CPU e memória do dispositivo do usuário.
- **Lentidão e Responsividade:** À medida que o volume de dados cresce (mais dias, mais campanhas), o tempo de carregamento do dashboard aumenta, e a interface pode se tornar lenta ou travar.
- **Duplicação de Lógica:** A mesma lógica de cálculo pode ser replicada em diferentes partes do aplicativo, dificultando a manutenção e garantindo a consistência.

- **Impacto Direto:**
    - **Experiência do Usuário:** Dashboards lentos e que consomem muitos recursos frustram o usuário e diminuem a percepção de qualidade do produto.
    - **Escalabilidade Limitada:** A aplicação não conseguirá lidar com clientes que tenham um grande número de campanhas ou um longo histórico de dados.
    - **Manutenibilidade:** A lógica de negócio crítica espalhada pelo frontend é mais difícil de depurar, testar e atualizar.

### 3.3. Sincronização Ineficiente e Redundante na Função `sync-daily-insights`

**Problema:** A função `sync-daily-insights`, que é executada a cada 3 horas pelo `pg_cron`, foi codificada para **ignorar os parâmetros de data e forçar a sincronização dos últimos 30 dias de dados**, independentemente da necessidade. Isso gera um volume massivo de operações redundantes e custos desnecessários.

**Evidências e Análise Técnica:**

O código da Edge Function contém uma lógica que sobrescreve qualquer data de início (`since`) fornecida, fixando-a em 30 dias antes da data atual.

```typescript
// supabase/functions/sync-daily-insights/index.ts:163-166

// Força o filtro de 30 dias, ignorando o que vier no body
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const since = thirtyDaysAgo.toISOString().split('T')[0];
const until = todayIso;
```

- **Redundância Massiva:** A cada 3 horas, o sistema busca e reescreve (`upsert`) 30 dias de dados para *todas as campanhas ativas de todas as contas*. Isso significa que os dados de um dia específico são reprocessados 8 vezes por dia. Por exemplo, os dados de 29 dias atrás são buscados e atualizados hoje, e serão buscados e atualizados novamente amanhã, e assim por diante, sem necessidade.

- **Custo de API e Banco de Dados:**
    - **API do Meta:** Essa abordagem multiplica desnecessariamente o número de chamadas à API do Meta, aumentando o risco de atingir os limites de taxa (`rate limiting`) e, dependendo do volume, gerando custos.
    - **Recursos do Supabase:** O `upsert` constante de dezenas de milhares de linhas consome I/O e CPU do banco de dados, o que pode degradar a performance de outras operações e aumentar os custos de computação.

- **Falsa Impressão de Configuração:** A configuração do cron job no arquivo de migração (`20251202200000_automation_cron_jobs.sql`) pretendia buscar apenas os últimos 7 dias, mas essa intenção é completamente ignorada pela lógica hard-coded na função.

- **Impacto Direto:**
    - **Financeiro:** Desperdício de recursos com chamadas de API e consumo de banco de dados que poderiam ser evitados.
    - **Técnico:** Risco aumentado de `rate limiting`, o que pode interromper a sincronização. A carga constante e desnecessária no banco de dados pode degradar a performance geral do sistema.
    - **Escalabilidade:** O problema se agrava linearmente com o número de contas e campanhas gerenciadas, tornando a arquitetura insustentável a longo prazo.

**Observação:** A estratégia ideal seria sincronizar apenas os dados que mudaram ou que são novos. Para insights diários, isso normalmente significa buscar apenas os dados do dia anterior (`D-1`) e, talvez, re-sincronizar os últimos 2-3 dias para acomodar o modelo de atribuição do Meta, que pode atualizar dados retroativamente. A estratégia atual de 30 dias é excessiva e ineficiente.

### 3.4. Confirmação da Sincronização da Hierarquia de Anúncios (Ad Sets e Ads)

**Análise:** Foi confirmado que o sistema já possui as tabelas e funções necessárias para sincronizar os níveis mais granulares da hierarquia de anúncios do Meta: `ad_sets` (conjuntos de anúncios) e `ads` (anúncios/criativos).

**Evidências e Análise Técnica:**

- **Tabelas de Armazenamento:**
  - `public.ad_sets`: Armazena dados dos conjuntos de anúncios.
  - `public.ads`: Armazena dados dos anúncios individuais.
  - `public.ad_set_daily_insights`: Armazena métricas diárias para conjuntos de anúncios.
  - `public.ad_daily_insights`: Armazena métricas diárias para anúncios.

- **Funções de Sincronização:**
  - `sync-ad-sets` e `sync-ad-sets-cron`: Para conjuntos de anúncios.
  - `sync-ads` e `sync-ads-cron`: Para anúncios.

- **Mecanismos de Gatilho:**
  - **Manual:** O hook `useAdSetsAndAds.ts` no frontend permite que o usuário dispare a sincronização.
  - **Automático:** Os cron jobs `sync_ad_sets_cron` e `sync_ads_cron` garantem a atualização periódica a cada 6 horas.

- **Volume de Dados:**
  - `ad_sets`: **35** registros.
  - `ads`: **136** registros.

- **Impacto:** A existência dessa estrutura valida que os dados de anúncios e conjuntos de anúncios já estão sendo coletados e armazenados, fornecendo a base necessária para análises de performance mais detalhadas. O problema principal não é a ausência de dados, mas sim a eficiência e a confiabilidade do processo de coleta, como detalhado nos outros pontos.
