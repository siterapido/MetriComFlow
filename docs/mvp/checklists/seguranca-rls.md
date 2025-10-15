# Checklist de Segurança e RLS

Objetivo: garantir proteção de dados, acesso controlado por papel (role) e uso seguro de tokens na integração com Meta Ads.

Referências
- docs/mvp/seguranca/permissoes-e-rls.md
- docs/mvp/seguranca/segredos-e-config.md
- docs/mvp/base-de-dados/modelo-de-dados.md

Políticas de RLS (Row-Level Security)
- Habilitar RLS nas tabelas:
  - ad_accounts: permitir SELECT apenas para roles admin/manager; INSERT/UPDATE apenas via Edge Functions (service role).
  - ad_campaigns: SELECT admin/manager; filtro por ad_account_id se necessário; INSERT/UPDATE via Edge.
  - campaign_daily_insights: SELECT admin/manager; acesso preferencial via RPC (security definer) para filtrar período.
  - leads: revisar visibilidade por papel; writes vindos do webhook/polling via service role.
- Views e RPCs:
  - Expor business_kpis e campaign_financials via RPCs com security definer (checagem de role antes de executar).
  - Garantir que usuários com role=user não vejam métricas financeiras.

Tokens e Segredos
- Armazenar em Supabase Secrets:
  - META_PAGE_ACCESS_TOKEN (escopo pages_manage_ads)
  - META_ADS_ACCESS_TOKEN (escopo ads_read, e leads_retrieval quando aplicável)
  - META_AD_ACCOUNT_ID (act_...)
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