# insightfy-adsets-ads-sync

Função Edge que sincroniza Ad Sets e Ads (criativos) do Meta Graph API para as tabelas `ad_sets` e `ads` do Supabase, usando o token OAuth armazenado em `meta_business_connections`.

## Pré-requisitos

- `SUPABASE_URL` (URL do seu projeto Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (chave service role do seu projeto)
- Migrações aplicadas para as tabelas:
  - `supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql`

## Rodar localmente (Supabase CLI)

1. Instale a CLI do Supabase:

```bash
npm i -g supabase
```

2. Exporte variáveis de ambiente (ou use `supabase secrets set` no projeto):

```bash
export SUPABASE_URL="https://<seu-projeto>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<sua-service-role-key>"
```

3. Sirva a função localmente:

```bash
supabase functions serve insightfy-adsets-ads-sync
```

4. Invoque a função (exemplo):

```bash
curl -X POST "http://localhost:54321/functions/v1/insightfy-adsets-ads-sync" \
  -H "Content-Type: application/json" \
  -d '{
    "logResponseSample": true,
    "limitPerCampaign": 5
  }'
```

## Parâmetros do body

```json
{
  "ad_account_ids": ["<uuid-ad-account>"] ,
  "campaign_ids": ["<uuid-campaign>"] ,
  "dryRun": false,
  "logResponseSample": true,
  "limitPerCampaign": 10
}
```

## Saída

```json
{
  "campaignsProcessed": 3,
  "adsetsSynced": 42,
  "adsSynced": 210,
  "errors": []
}
```

