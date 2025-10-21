# Checklist de Segurança e RLS

Objetivo: garantir proteção de dados, acesso controlado por papel (role) e uso seguro de tokens na integração com Meta Ads.

Referências
- docs/mvp/seguranca/permissoes-e-rls.md
- docs/mvp/seguranca/segredos-e-config.md
- docs/mvp/base-de-dados/modelo-de-dados.md

- Políticas de RLS (Row-Level Security)
  - `ad_accounts`, `ad_campaigns`, `campaign_daily_insights`: SELECT somente para `has_metrics_access` (owner + traffic_manager); mutações apenas via Edge Functions.
  - `leads`, `tasks`, `interactions`, `comments`, `attachments`, `checklist_items`, `labels`, `lead_labels`: SELECT/INSERT/UPDATE permitem apenas `has_crm_access` (owner + sales); DELETE restrito a `is_owner`.
  - Validar funções auxiliares (`has_meta_access`, `has_task_access`) se novas tabelas forem adicionadas.
- Views e RPCs:
  - Expor business_kpis e campaign_financials via RPCs com security definer (checagem de role antes de executar).
  - Garantir que perfis `sales` (user_type) não vejam métricas financeiras.

Tokens e Segredos
- Armazenar em Supabase Secrets:
  - `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`
  - `META_PAGE_ACCESS_TOKEN`, `META_SYSTEM_USER_TOKEN`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Rotação: implementar checagem de expiração, notificação a admin e rotação segura.
- Não trafegar tokens no frontend; sanitizar logs.

Auditoria e LGPD
- Tabela de auditoria: lead_activity para registrar transições de status (quem, quando, de→para, motivo).
- Minimização de dados: armazenar somente field_data necessário; política de exclusão sob solicitação.
- Documentar retenção de dados e anonimização quando aplicável.

Testes de Segurança
- RLS: validar que role=user não acessa ad_accounts/ad_campaigns/campaign_daily_insights.
- RPCs: garantir que security definer e checagem de role estão ativos.
- Tokens: teste de falha em expiração/escopo insuficiente sem vazar segredos.

Critérios de Aceite
- RLS habilitado e efetivo em todas as tabelas de Ads/Insights/Leads.
- Métricas financeiras indisponíveis para role=user.
- Tokens protegidos, rotação documentada e logs sem dados sensíveis.
