# Papéis, Permissões e RLS (Supabase)

Papéis previstos
- Admin (Dono): acesso total, incluindo métricas financeiras e configuração.
- Vendedor (User): acesso ao Kanban e aos próprios leads; não vê consolidados financeiros.
- (Opcional) Manager: acesso a leitura de métricas, gestão de equipe.

RLS (linhas)
- `leads`:
  - SELECT: Admin/Manager veem todos; User vê leads criados por si ou com `assignee_profile_id = auth.uid()`.
  - UPDATE: User pode atualizar `status` e `value` dos próprios/atribuídos; Admin pode atualizar tudo (inclusive `lost_reason`, `closed_*`).
  - INSERT: qualquer autenticado; se `source='meta_ads'`, preferir inserir via Edge Function.

- Views `business_kpis` e `campaign_financials`:
  - RLS não se aplica a views. Exponha via RPC (security definer) que valida `profiles.role` antes de retornar.

- `ad_accounts`, `ad_campaigns`, `campaign_daily_insights`:
  - SELECT restrito a Admin/Manager.
  - INSERT/UPDATE somente via Edge Functions (tokens e ingestão).

Enforcement no Frontend
- Proteção de rotas: esconder Dashboard/Relatórios para `user`.
- Componentes: esconder cards financeiros para `user`.

Auditoria e Triggers
- Continuar registrando movimentações em `lead_activity` ao mudar status.
- Atualizar automaticamente `closed_won_at`/`closed_lost_at` via trigger na transição.

## Permissões da Integração Meta (Marketing API)
- Escopos mínimos necessários para o MVP:
  - `ads_read`: leitura de Insights (conta/campanha/adset/ad).
  - `pages_manage_ads`: assinatura de webhooks de Página e gestão de anúncios vinculados.
  - `leads_retrieval`: recebimento/leitura de Leads de Lead Ads.
- Tokens e contextos:
  - Usar `PAGE_ACCESS_TOKEN` para `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen` (assinar webhooks de leadgen).
  - Usar `User Access Token`/`System User Token` com `ads_read` para Insights (`/{campaign_id}/insights`, `act_{ad_account_id}/insights`).
  - Nunca expor tokens no frontend; armazenar em Supabase Secrets e acessar via Edge Functions.
- App Review e Modo Desenvolvimento:
  - Em Development Mode, webhooks e leads funcionam apenas para usuários/testers autorizados.
  - Para produção, o app precisa passar por App Review para `leads_retrieval` e, quando aplicável, permissões de Página.
  - Documentar fluxo de consentimento e política de privacidade conforme exigências do Meta.