# Checklist de Testes e QA

Objetivo: cobrir testes unitários, integração, E2E e segurança para garantir estabilidade e consistência dos dados.

Referências
- docs/mvp/metricas/calculos.md
- docs/mvp/base-de-dados/migracoes-propostas.sql
- docs/mvp/seguranca/permissoes-e-rls.md

Unitários
- Mapear leads_count: actions[action_type='lead'] → soma correta.
- Deduplicação: inserção de lead com external_lead_id repetido deve falhar/ser ignorada conforme índice único parcial.
- Triggers: preenchimento automático de closed_won_at/closed_lost_at e atualização de lead_activity/contadores.
- Enum: garantir que status aceitos (`novo_lead`, `qualificacao`, `proposta`, `negociacao`, `follow_up`, `aguardando_resposta`, `fechado_ganho`, `fechado_perdido`) estão sincronizados com o frontend.
- Métricas: proteção contra divisão por zero em CPL/ROAS.

Integração
- meta-insights-sync: coleta diária, paginação e retrocoleta; persistência em campaign_daily_insights.
- meta-leads-webhook: verificação de X-Hub-Signature, verify token; persistência de payload; deduplicação.
- Fallback GET /{LEAD_ID}?fields=field_data,created_time para complementar dados.
- Atualização manual: garantir que `refreshData` em `MetaAdsConfig` dispara o sync e reflete status no UI.

E2E
- Do recebimento do lead até criação de card no Kanban; transições de status e registro de auditoria (lost_reason obrigatório).
- Visão `LeadsLinear` com filtros combinados (status + prioridade + origem).
- Relatórios por campanha com filtros e export CSV.

Segurança/RLS
- role=user não acessa métricas financeiras; policies efetivas nas tabelas restritas.
- RPCs com security definer e checagem de role.

Performance/Robustez
- Carga de 1k leads/dia e múltiplas campanhas; tempos de renderização aceitáveis.
- Rate limit/backoff adequados no cron de insights.

Critérios de Aceite
- Suíte de testes automatizada cobrindo fluxos críticos passa no CI.
- Falhas sensíveis não revelam segredos; logs sanitizados.
