# 🤖 Automação: Cron Jobs para Meta Ads

## 📋 Visão Geral

Este documento explica como configurar e usar os **cron jobs automáticos** que sincronizam dados do Meta Ads e processam conversões para CAPI.

### O Que Foi Implementado

✅ **3 Cron Jobs Automáticos**:
1. **Sincronização de Métricas** - A cada 3 horas (00:00, 03:00, 06:00, ...)
2. **Dispatch de Conversões** - A cada 5 minutos
3. **Limpeza de Logs** - Diariamente às 02:00

✅ **Infraestrutura**:
- Tabela `cron_job_logs` para monitoramento
- Funções SQL para invocar Edge Functions
- UI de monitoramento em `/meta-ads-config`
- Execução manual via interface

---

## 🚀 Setup Rápido (5 Minutos)

### Passo 1: Aplicar Migration

Execute a migration no **Supabase SQL Editor**:

```bash
# Abra o arquivo:
supabase/migrations/20251202200000_automation_cron_jobs.sql

# Copie todo o conteúdo
# Cole no Supabase Dashboard > SQL Editor
# Execute
```

**O que isso faz**:
- Habilita extensões `pg_cron` e `http`
- Cria tabela `cron_job_logs`
- Cria funções SQL para invocar Edge Functions
- Agenda os 3 cron jobs
- Cria views e funções de monitoramento

**Verificar**:
```sql
-- Deve retornar 3 linhas
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'sync-meta-insights-every-3h',
  'dispatch-meta-conversions-every-5min',
  'cleanup-old-cron-logs-daily'
);
```

---

### Passo 2: Configurar Secrets

#### Opção A: Script Automático (Recomendado)

```bash
chmod +x scripts/setup-cron-secrets.sh
./scripts/setup-cron-secrets.sh
```

O script irá:
1. Detectar URL do projeto
2. Solicitar Service Role Key
3. Configurar secrets no Supabase
4. Verificar configuração

#### Opção B: Manual

```bash
# 1. Obter projeto ref (da URL)
# Exemplo: https://mmfuzxqglgfmotgikqav.supabase.co
# Ref = mmfuzxqglgfmotgikqav

# 2. Configurar secrets
npx supabase secrets set SUPABASE_PROJECT_URL="https://seu-projeto.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# 3. Verificar
npx supabase secrets list
```

**Onde encontrar Service Role Key**:
- Supabase Dashboard
- Settings > API
- `service_role` key (secret) - **NÃO compartilhe esta chave!**

---

### Passo 3: Testar

#### Verificar se Jobs Estão Rodando

```sql
-- Ver jobs agendados
SELECT * FROM cron.job;

-- Ver últimas execuções
SELECT * FROM public.cron_job_logs
ORDER BY started_at DESC
LIMIT 10;

-- Resumo últimas 24h
SELECT * FROM public.get_cron_job_summary();
```

#### Executar Job Manualmente (Teste)

**Via UI** (Recomendado):
1. Abrir `/meta-ads-config`
2. Rolar até "Monitoramento de Jobs Automáticos"
3. Aba "Executar Manualmente"
4. Clicar "Executar Agora" no job desejado

**Via SQL**:
```sql
-- Sincronizar métricas
SELECT public.sync_meta_insights_cron();

-- Processar conversões
SELECT public.dispatch_meta_conversions_cron();
```

**Via Edge Function Direta**:
```bash
# Sincronizar métricas
curl -X POST "https://seu-projeto.supabase.co/functions/v1/sync-daily-insights" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2025-01-01",
    "until": "2025-01-08"
  }'

# Processar conversões
curl -X POST "https://seu-projeto.supabase.co/functions/v1/meta-conversion-dispatch" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"process_all": true}'
```

---

## 📊 Monitoramento via UI

### Acessar Interface de Monitoramento

1. Navegar para `/meta-ads-config`
2. Rolar até a seção "Monitoramento de Jobs Automáticos"
3. 3 abas disponíveis:

#### Aba 1: Resumo
- Cards com estatísticas de cada job
- Taxa de sucesso (%)
- Última execução
- Total de execuções (24h)
- Duração média

#### Aba 2: Logs Recentes
- Tabela com últimas 50 execuções
- Filtro por job específico
- Status, duração, resposta HTTP

#### Aba 3: Executar Manualmente
- Botões para forçar execução
- Útil para:
  - Testar configuração
  - Forçar sincronização imediata
  - Debug de problemas

---

## 🔍 Queries Úteis para Monitoramento

### Dashboard de Performance

```sql
-- Resumo geral
SELECT
  job_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) as success_rate,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms,
  MAX(started_at) as last_run
FROM public.cron_job_logs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY job_name
ORDER BY job_name;
```

### Últimas Execuções com Erro

```sql
SELECT
  job_name,
  started_at,
  duration_ms,
  response_status,
  error_message,
  LEFT(response_body, 200) as response_preview
FROM public.cron_job_logs
WHERE status = 'error'
  AND started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
```

### Performance ao Longo do Tempo

```sql
SELECT
  DATE_TRUNC('hour', started_at) as hour,
  job_name,
  COUNT(*) as runs,
  AVG(duration_ms) as avg_duration,
  COUNT(*) FILTER (WHERE status = 'success') as successful
FROM public.cron_job_logs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, job_name
ORDER BY hour DESC, job_name;
```

### Alertas de Performance

```sql
-- Jobs com taxa de sucesso < 90%
SELECT
  job_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) as success_rate
FROM public.cron_job_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY job_name
HAVING ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) < 90;
```

---

## ⚙️ Detalhes Técnicos

### Job 1: Sincronização de Métricas

**Nome**: `sync-meta-insights-every-3h`
**Schedule**: `0 */3 * * *` (a cada 3 horas)
**Edge Function**: `sync-daily-insights`

**O que faz**:
1. Busca métricas dos últimos 7 dias do Meta Ads
2. Atualiza tabelas:
   - `ad_campaigns`
   - `campaign_daily_insights`
3. Dados sincronizados:
   - Spend (investimento)
   - Impressions
   - Clicks
   - Leads count

**Parâmetros**:
```json
{
  "since": "YYYY-MM-DD",  // Hoje - 7 dias
  "until": "YYYY-MM-DD",  // Hoje
  "maxDaysPerChunk": 30
}
```

**Horários de Execução** (timezone UTC):
- 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00

---

### Job 2: Dispatch de Conversões

**Nome**: `dispatch-meta-conversions-every-5min`
**Schedule**: `*/5 * * * *` (a cada 5 minutos)
**Edge Function**: `meta-conversion-dispatch`

**O que faz**:
1. Busca eventos com `status = 'pending'` em `meta_conversion_events`
2. Para cada evento:
   - Hash SHA-256 de PII (email, phone, name)
   - POST para Meta Conversions API
   - Atualiza status para 'sent' ou 'error'
3. Retry automático de eventos falhados (até max_retries)

**Parâmetros**:
```json
{
  "process_all": true,
  "max_batch_size": 100
}
```

**Quando Dispara**:
- A cada 5 minutos, 24/7
- Processa até 100 eventos por execução

---

### Job 3: Limpeza de Logs

**Nome**: `cleanup-old-cron-logs-daily`
**Schedule**: `0 2 * * *` (02:00 diariamente)
**Função**: `cleanup_old_cron_logs()`

**O que faz**:
1. Remove logs de `cron_job_logs` com mais de 30 dias
2. Previne crescimento excessivo da tabela
3. Mantém histórico de 1 mês

---

## 🛠️ Troubleshooting

### Job Não Está Executando

**Verificar se job está ativo**:
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'sync-meta-insights-every-3h';
```

Se `active = false`:
```sql
-- Reativar job
SELECT cron.alter_job(
  jobid,
  active := true
)
FROM cron.job
WHERE jobname = 'sync-meta-insights-every-3h';
```

**Verificar logs de erro do pg_cron**:
```sql
SELECT *
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'sync-%')
ORDER BY start_time DESC
LIMIT 20;
```

---

### Job Falhando Consistentemente

**Verificar erro específico**:
```sql
SELECT
  job_name,
  error_message,
  response_status,
  response_body,
  started_at
FROM public.cron_job_logs
WHERE status = 'error'
  AND job_name = 'sync-daily-insights'
ORDER BY started_at DESC
LIMIT 5;
```

**Erros Comuns**:

| Erro | Causa | Solução |
|------|-------|---------|
| `Connection refused` | Edge Function não acessível | Verificar URL do projeto nas secrets |
| `401 Unauthorized` | Service Role Key inválida | Reconfigurar secret |
| `Meta API rate limit` | Muitas requisições | Aguardar 1 hora, reduzir frequência |
| `No campaigns found` | Sem campanhas ativas | Normal se não houver campanhas |
| `Token expired` | Access token do Meta expirado | Reconectar Meta Business |

---

### Edge Function Não Respondendo

**Verificar se Edge Function está deployada**:
```bash
npx supabase functions list
```

**Redeployar se necessário**:
```bash
npx supabase functions deploy sync-daily-insights
npx supabase functions deploy meta-conversion-dispatch
```

**Ver logs da Edge Function**:
```bash
npx supabase functions logs sync-daily-insights --limit 20
npx supabase functions logs meta-conversion-dispatch --limit 20
```

---

### Secrets Não Configuradas

**Sintomas**:
- Job cria log mas não executa
- Erro: "undefined is not a valid URL"

**Verificar secrets**:
```bash
npx supabase secrets list
```

**Reconfigurar**:
```bash
./scripts/setup-cron-secrets.sh
```

---

## 🔧 Modificar Schedule dos Jobs

### Alterar Frequência de Sincronização

**Exemplo: Mudar de 3h para 1h**:

```sql
SELECT cron.alter_job(
  jobid,
  schedule := '0 * * * *'  -- A cada 1 hora
)
FROM cron.job
WHERE jobname = 'sync-meta-insights-every-3h';
```

**Exemplo: Mudar de 5min para 10min**:

```sql
SELECT cron.alter_job(
  jobid,
  schedule := '*/10 * * * *'  -- A cada 10 minutos
)
FROM cron.job
WHERE jobname = 'dispatch-meta-conversions-every-5min';
```

### Pausar Job Temporariamente

```sql
SELECT cron.alter_job(
  jobid,
  active := false
)
FROM cron.job
WHERE jobname = 'sync-meta-insights-every-3h';
```

### Reativar Job

```sql
SELECT cron.alter_job(
  jobid,
  active := true
)
FROM cron.job
WHERE jobname = 'sync-meta-insights-every-3h';
```

### Remover Job Completamente

```sql
SELECT cron.unschedule('sync-meta-insights-every-3h');
```

---

## 📈 Métricas de Performance Esperadas

### Job: Sincronização de Métricas

| Métrica | Valor Esperado |
|---------|----------------|
| Duração média | 5-15 segundos |
| Taxa de sucesso | > 95% |
| Frequência | 8x por dia |
| Dados sincronizados | 7 dias x N campanhas |

### Job: Dispatch de Conversões

| Métrica | Valor Esperado |
|---------|----------------|
| Duração média | 2-8 segundos |
| Taxa de sucesso | > 90% |
| Frequência | 288x por dia (12/hora) |
| Eventos por execução | 0-100 |

### Job: Limpeza de Logs

| Métrica | Valor Esperado |
|---------|----------------|
| Duração média | < 1 segundo |
| Taxa de sucesso | 100% |
| Frequência | 1x por dia |
| Logs removidos | Variável |

---

## 🎯 Boas Práticas

### 1. Monitoramento Regular
- Verificar dashboard de cron jobs semanalmente
- Configurar alertas se taxa de sucesso < 90%
- Investigar falhas imediatamente

### 2. Logs
- Manter retenção de 30 dias (configuração padrão)
- Exportar logs críticos para análise externa
- Usar queries de performance para identificar gargalos

### 3. Scheduling
- Evitar horários de pico (09:00-18:00 BRT) para jobs pesados
- Espaçar jobs para evitar sobrecarga simultânea
- Considerar timezone do servidor (UTC)

### 4. Error Handling
- Implementar retry automático (já incluso)
- Alertar equipe técnica em falhas consecutivas
- Manter Meta Access Token sempre atualizado

---

## 📚 Referências

**Arquivos Criados**:
- [`supabase/migrations/20251202200000_automation_cron_jobs.sql`](../supabase/migrations/20251202200000_automation_cron_jobs.sql) - Migration completa
- [`scripts/setup-cron-secrets.sh`](../scripts/setup-cron-secrets.sh) - Script de setup
- [`src/hooks/useCronJobs.ts`](../src/hooks/useCronJobs.ts) - Hooks React
- [`src/components/meta-ads/CronJobsMonitor.tsx`](../src/components/meta-ads/CronJobsMonitor.tsx) - UI de monitoramento

**Documentação Relacionada**:
- [INTEGRACAO-META-ADS-COMPLETA.md](../INTEGRACAO-META-ADS-COMPLETA.md) - Integração Meta Ads
- [ROADMAP-META-ADS.md](../ROADMAP-META-ADS.md) - Roadmap completo
- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## ✅ Checklist de Configuração

Antes de considerar a configuração completa, verificar:

- [ ] Migration aplicada sem erros
- [ ] Secrets configuradas (SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] 3 jobs aparecem em `SELECT * FROM cron.job`
- [ ] Teste manual funcionou (via UI ou SQL)
- [ ] Logs aparecem em `cron_job_logs` após primeira execução
- [ ] Dashboard de monitoramento acessível em `/meta-ads-config`
- [ ] Edge Functions deployadas e funcionais
- [ ] Meta Access Token configurado
- [ ] Taxa de sucesso > 90% após 24 horas

---

**Última Atualização**: 2025-12-02
**Versão**: 1.0
**Status**: ✅ Pronto para Produção
