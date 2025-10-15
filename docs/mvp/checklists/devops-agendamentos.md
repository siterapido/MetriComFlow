# Checklist de DevOps e Agendamentos

Objetivo: orquestrar migrações, deploys, agendamentos (cron) e observabilidade das integrações.

Referências
- SETUP_SUPABASE.md, SUPABASE_OVERVIEW.md
- docs/mvp/integracoes/checklist-implementacao.md

Migrations e Ambientes
- Supabase CLI: criar branch de desenvolvimento; aplicar migrations (portar migracoes-propostas.sql).
- Gerar tipos TypeScript pós-migrations e sincronizar no frontend.
- Política de merge de branch para produção após validação.

Agendamentos (Cron)
- Agendar meta-insights-sync em horários definidos (UTC); documentar janela e timezone.
- Monitorar execuções (logs) e reprocessar falhas.
- Suportar time_range custom (retrocoleta) manual quando necessário.

Segredos e Config
- Confirmar presença de META_PAGE_ACCESS_TOKEN, META_ADS_ACCESS_TOKEN, META_AD_ACCOUNT_ID, SUPABASE_SERVICE_ROLE_KEY.
- Rotação de tokens e alerta de expiração.

Observabilidade
- Logs sanitizados; métricas de execução (tempo, volume, erros).
- Alertas para falhas de cron, rate limit e tokens inválidos.

CI/CD
- Pipeline de deploy de Edge Functions e migrations (ex.: GitHub Actions).
- Testes automatizados executados no CI antes do deploy.

Critérios de Aceite
- Cron de insights rodando estável; falhas detectadas e reprocessadas.
- Migrations versionadas e aplicadas sem drift.
- Alertas e logs suficientes para operar a integração.