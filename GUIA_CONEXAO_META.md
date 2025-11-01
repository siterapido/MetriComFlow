# Guia Completo: Conectar Meta Ads e Visualizar Dados

## Problema Atual

O sistema está mostrando "Sem dados" porque:

❌ **0 contas de anúncios conectadas**
❌ **0 campanhas sincronizadas**
❌ **0 insights no banco de dados**

## Solução: Passo a Passo

### Passo 1: Login com o Usuário Correto

1. Acesse: https://www.insightfy.com.br
2. Faça login com:
   - **Email**: `marcos@insightfy.com.br`
   - (Este é o usuário que tem a conexão Meta ativa)

### Passo 2: Conectar Contas Meta Ads

1. Após login, vá para: **Métricas Meta Ads** (menu lateral)
   - Ou acesse direto: https://www.insightfy.com.br/meta-ads-config

2. Você verá um botão **"Conectar Contas"** ou **"Adicionar Conta"**

3. Clique e selecione as 3 contas disponíveis:
   ```
   ✓ Marcos de Souza (199415206844304)
   ✓ CA - SITE RAPIDO (1558732224693082)
   ✓ Smartcell (1398847601234023)
   ```

4. Confirme a conexão

### Passo 3: Aguardar Sincronização Automática

Após conectar as contas, o sistema irá automaticamente:

1. ✅ Criar registros em `ad_accounts`
2. ✅ Buscar todas as campanhas da conta
3. ✅ Salvar em `ad_campaigns`

**IMPORTANTE**: Este processo pode levar de 10 a 30 segundos por conta.

### Passo 4: Sincronizar Insights Históricos

Os insights (métricas diárias) NÃO são sincronizados automaticamente. Você precisa executar manualmente:

```bash
# Opção 1: Via Supabase CLI (Local)
npx supabase functions invoke sync-daily-insights \
  --data '{
    "since": "2024-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30,
    "logResponseSample": true
  }'

# Opção 2: Via curl (pode usar de qualquer lugar)
curl -X POST https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-daily-insights \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2024-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30
  }'
```

**Período recomendado**:
- Para 2025 completo: `"since": "2025-01-01", "until": "2025-12-31"`
- Para último ano: `"since": "2024-01-01", "until": "2025-12-31"`
- Para todo o histórico disponível: `"since": "2020-01-01", "until": "2025-12-31"`

### Passo 5: Verificar se os Dados Apareceram

1. Volte para **Dashboard** ou **Métricas Meta Ads**
2. O filtro "Todo o período" deve mostrar:
   - ✅ Investimento Total
   - ✅ Leads Gerados
   - ✅ CPL (Custo por Lead)
   - ✅ Taxa de Cliques (CTR)
   - ✅ Gráfico de histórico
   - ✅ Tabela de campanhas

## Verificação do Estado Atual

Execute este comando para verificar o que já foi feito:

```bash
npx tsx scripts/check-ad-accounts.ts
```

Deve mostrar:
```
📊 CONTAS ATIVAS: 3
📢 CAMPANHAS: X
📈 TOTAL DE INSIGHTS: Y
```

## Troubleshooting

### Problema 1: "Conta já está conectada"

Se aparecer erro de duplicidade ao tentar conectar:

```bash
# Limpe as contas antigas primeiro
npx tsx scripts/fix-ad-accounts.ts
```

Depois tente conectar novamente.

### Problema 2: Campanhas não aparecem após conectar

1. Desconecte a conta em /meta-ads-config
2. Aguarde 5 segundos
3. Conecte novamente
4. O sistema irá refazer a sincronização das campanhas

### Problema 3: Insights não sincronizam

Verifique os logs da Edge Function:

```bash
npx supabase functions logs sync-daily-insights --limit 20
```

Erros comuns:
- **Token expirado**: Reconecte a conta Meta via OAuth
- **Rate limit**: Aguarde 1 hora e tente novamente
- **Campanhas sem insights**: Verifique se as campanhas estavam ativas no período solicitado

### Problema 4: "Sem dados" mesmo após sincronização

1. Verifique se a organização está correta:
   ```bash
   npx tsx scripts/check-user-org.ts
   ```

2. Verifique se os dados estão na organização certa:
   ```sql
   SELECT
     aa.business_name,
     aa.organization_id,
     COUNT(c.id) as campanhas,
     COUNT(i.id) as insights
   FROM ad_accounts aa
   LEFT JOIN ad_campaigns c ON c.ad_account_id = aa.id
   LEFT JOIN campaign_daily_insights i ON i.campaign_id = c.id
   WHERE aa.is_active = TRUE
   GROUP BY aa.id, aa.business_name, aa.organization_id;
   ```

## Scripts Úteis

| Script | Descrição |
|--------|-----------|
| `check-ad-accounts.ts` | Verificar contas, campanhas e insights |
| `fix-ad-accounts.ts` | Limpar contas duplicadas/antigas |
| `fix-and-migrate.ts` | Migrar conexão Meta entre usuários |
| `check-user-org.ts` | Verificar organizações do usuário |

## Fluxo Completo de Dados

```
1. OAuth Meta Business
   ↓
2. Conectar Conta via UI
   ↓
3. Edge Function busca campanhas automaticamente
   ↓
4. Salva em ad_campaigns
   ↓
5. Executar sync-daily-insights manualmente
   ↓
6. Salva em campaign_daily_insights
   ↓
7. Dashboard e Métricas mostram os dados ✅
```

## Estimativa de Tempo

- **Conectar 1 conta**: ~10 segundos
- **Sincronizar campanhas**: Automático (junto com conexão)
- **Sincronizar insights (1 ano)**: 2-5 minutos
- **Sincronizar insights (todo histórico)**: 5-15 minutos

## Importante

⚠️ **A sincronização de insights NÃO é automática!**

Você precisa executar manualmente a Edge Function `sync-daily-insights` após conectar as contas.

Recomendamos configurar um cron job para rodar diariamente:

```sql
-- Exemplo de cron job no Supabase (requer extensão pg_cron)
SELECT cron.schedule(
  'sync-meta-insights-daily',
  '0 3 * * *',  -- Todo dia às 3h da manhã
  $$
  SELECT net.http_post(
    url := 'https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-daily-insights',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  );
  $$
);
```

---

**Data**: 31 de Outubro de 2025
**Status**: Aguardando conexão das contas Meta Ads
