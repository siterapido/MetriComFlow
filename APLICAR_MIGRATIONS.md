# 🚀 Guia Rápido - Aplicar Migrations e Obter Dados

## ✅ Status Atual

- ✅ Edge Functions deployadas:
  - `sync-ad-sets` → Busca conjuntos de anúncios
  - `sync-ads` → Busca criativos
- ⏳ **Migration pendente**: Precisa aplicar no banco de dados

---

## 📋 Passo a Passo (5 minutos)

### 1️⃣ Aplicar Migration no Banco (OBRIGATÓRIO)

**Acesse o SQL Editor:**
```
https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/sql/new
```

**Copie e cole o SQL:**
Arquivo: `scripts/apply-ad-sets-migration-manual.sql`

Ou copie diretamente daqui:
```bash
# No terminal:
cat /Users/marcosalexandre/metricom-flow/scripts/apply-ad-sets-migration-manual.sql

# Cole TODO o conteúdo no SQL Editor e clique em "Run"
```

**O que será criado:**
- ✅ Tabela `ad_sets` (conjuntos de anúncios)
- ✅ Tabela `ads` (criativos individuais)
- ✅ Tabela `ad_set_daily_insights` (métricas por conjunto)
- ✅ Tabela `ad_daily_insights` (métricas por criativo)
- ✅ Policies RLS (segurança por organização)
- ✅ Índices para performance
- ✅ Triggers de updated_at

---

### 2️⃣ Sincronizar Dados do Meta

Depois de aplicar a migration:

1. **Acesse a página:** `/metricas`
2. **Clique em "Sincronizar"** (botão no topo direito)
3. **Aguarde:** O sistema vai buscar:
   - Campanhas (já existe)
   - Conjuntos de anúncios (novo)
   - Criativos/anúncios (novo)

**Ou via API (manual):**

```bash
# 1. Sincronizar conjuntos de anúncios
curl -X POST "https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-ad-sets" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. Sincronizar criativos
curl -X POST "https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-ads" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 3️⃣ Verificar Resultados

**No SQL Editor, rode:**

```sql
-- Verificar conjuntos criados
SELECT COUNT(*) as total_ad_sets FROM ad_sets;

-- Verificar criativos criados
SELECT COUNT(*) as total_ads FROM ads;

-- Verificar últimos criativos sincronizados
SELECT
  a.name,
  a.creative_type,
  a.status,
  s.name as ad_set_name,
  c.name as campaign_name
FROM ads a
INNER JOIN ad_sets s ON s.id = a.ad_set_id
INNER JOIN ad_campaigns c ON c.id = s.campaign_id
ORDER BY a.created_at DESC
LIMIT 10;
```

---

## 🎯 Usar a Nova Interface

Após sincronizar, acesse: `/metricas`

**4 Tabs disponíveis:**

1. **Overview**
   - Top 5 Criativos por Leads
   - Top 5 Criativos por CTR
   - Alertas de low performers

2. **Campanhas**
   - Performance consolidada

3. **Conjuntos**
   - Métricas por Ad Set
   - Filtros por conjunto específico

4. **Criativos** ⭐ (NOVO)
   - Grid visual com previews
   - Métricas completas por criativo
   - Meta Quality Rankings

---

## 📊 Próxima Etapa (Opcional - Métricas Históricas)

Para ter dados de performance por criativo, você precisará:

### Criar função para sincronizar insights:

Ainda não implementado (próximo passo):
- `sync-adset-insights` - Busca métricas históricas de conjuntos
- `sync-ad-insights` - Busca métricas históricas de criativos

Esses dados virão da Meta Insights API e preencherão:
- `ad_set_daily_insights`
- `ad_daily_insights`

---

## 🐛 Troubleshooting

### Migration falhou?
**Erro comum:** Tabela já existe

**Solução:** O script usa `CREATE TABLE IF NOT EXISTS`, é seguro rodar novamente.

### Sync retorna vazio?
**Causas possíveis:**
1. Token do Meta expirado → Reconectar em `/meta-ads-config`
2. Campanhas não existem → Sync campanhas primeiro
3. Conta não tem conjuntos/ads ativos no Meta

**Verificar:**
```sql
-- Ver campanhas disponíveis
SELECT id, external_id, name FROM ad_campaigns;

-- Ver conexão Meta ativa
SELECT
  meta_user_name,
  is_active,
  token_expires_at
FROM meta_business_connections
WHERE is_active = true;
```

### Criativos sem preview?
Normal se:
- Meta não retornou URL de imagem/vídeo
- Criativo é tipo CAROUSEL/COLLECTION (não suportado ainda no preview)

---

## ✅ Checklist de Verificação

- [ ] Migration aplicada no SQL Editor
- [ ] Edge Functions deployadas (já feito ✅)
- [ ] Botão "Sincronizar" clicado em `/metricas`
- [ ] Conjuntos aparecendo na Tab "Conjuntos"
- [ ] Criativos aparecendo na Tab "Criativos"
- [ ] Preview de imagens funcionando

---

## 📞 Suporte

Se algo não funcionar:

1. **Verifique logs das Edge Functions:**
   ```bash
   npx supabase functions logs sync-ad-sets --limit 50
   npx supabase functions logs sync-ads --limit 50
   ```

2. **Verifique no console do navegador** (F12 → Console)

3. **Verifique se as tabelas foram criadas:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('ad_sets', 'ads', 'ad_set_daily_insights', 'ad_daily_insights');
   ```

---

**Última atualização:** 03/12/2025
**Versão:** 1.0.0
