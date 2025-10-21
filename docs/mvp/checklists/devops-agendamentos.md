# Checklist de DevOps e Agendamentos

Objetivo: orquestrar migrações, deploys, agendamentos (cron) e observabilidade das integrações.

Referências
- SETUP_SUPABASE.md, SUPABASE_OVERVIEW.md
- docs/mvp/integracoes/checklist-implementacao.md

Migrations e Ambientes
- Supabase CLI: aplicar migrations oficiais (`supabase/migrations/*`) + complementos (`docs/mvp/base-de-dados/migracoes-propostas.sql`) em branch de dev antes do merge.
- Gerar tipos TypeScript (`supabase gen types typescript --linked`) e atualizar `src/lib/database.types.ts`.
- Registrar versão do banco (tag + commit) e validar drift com `supabase db diff`.

Agendamentos (Cron)
- Agendar meta-insights-sync em horários definidos (UTC); documentar janela e timezone.
- Monitorar execuções (logs) e reprocessar falhas.
- Suportar time_range custom (retrocoleta) manual quando necessário.

Segredos e Config
- Checar secrets obrigatórios: `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_PAGE_ACCESS_TOKEN`, `META_SYSTEM_USER_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.
- Rotacionar tokens antes do vencimento; adicionar alerta (Supabase + monitor externo).
- `scripts/sync-envs.sh` precisa refletir variáveis novas para ambientes locais.

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
