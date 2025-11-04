# 🚀 Quick Start: Métricas de Tráfego

## ✅ Status Atual

- ✅ **Navegação implementada** - "Métricas" está no sidebar
- ✅ **Página criada** - Acesse `/metricas`
- ✅ **Edge Functions prontas** - Sincronização via botão ou script
- ⏳ **Cron jobs** - Implementar manualmente quando necessário

---

## 🎯 3 Passos Para Começar

### 1️⃣ Conectar Meta Ads (1 minuto)

```
1. Acesse: http://localhost:8082/meta-ads-config
2. Clique: "Conectar Meta Business"
3. Autorize no Meta Business Manager
4. Selecione uma conta
5. Clique: "Conectar Conta" para adicionar ad account
```

### 2️⃣ Sincronizar Dados (2-3 minutos)

#### **Opção A: Via Interface (Mais Fácil)**
```
1. Acesse: http://localhost:8082/metricas
2. Clique: "Sincronizar" (botão azul)
3. Aguarde os 4 passos:
   ✅ Campanhas
   ✅ Conjuntos de Anúncios
   ✅ Criativos
   ✅ Métricas
```

#### **Opção B: Via Script (Automático)**
```

```

#### **Opção C: Simulação (Sem Risco)**


### 3️⃣ Visualizar Dados (Imediato)

```
Acesse: http://localhost:8082/metricas

Você verá 4 tabs:
├─ Overview      → Top criativos e alertas
├─ Campanhas     → Tabela com todas as campanhas
├─ Conjuntos     → Grid de ad sets com métricas
└─ Criativos     → Grid visual com preview de criativos
```

---

## 🎨 O Que Você Verá

### Tab: Overview
- ⭐ Top 5 criativos por leads
- 📈 Top 5 criativos por CTR
- ⚠️ Alertas: Criativos com alto gasto e zero leads

### Tab: Campanhas
- 📊 Tabela com todas as campanhas
- 💰 Investimento, leads, CPL, ROAS, CTR
- Ordenação customizável

### Tab: Conjuntos
- 📦 Grid de ad sets (conjuntos de anúncios)
- 🎯 Leads, CPL, gasto por conjunto
- Filtro por conjunto específico

### Tab: Criativos
- 🎨 Grid visual com preview de imagem/vídeo
- ⭐ Quality Ranking (Meta Ads native)
- 📊 CPL, leads, impressões, CTR
- Tipo de criativo exibido

---

## 📍 Navegação

**No Sidebar:**
```
MetriCom Flow
├─ Dashboard Geral
├─ Leads
├─ Formulários
├─ 👉 Métricas          ← Clique aqui
├─ Gestão de Equipe
├─ Planos
└─ Meu Perfil
```

---

## 🔧 Sincronização via Script

### Sincronizar Últimos 7 Dias (Padrão)
```bash
./scripts/sync-meta-ads-metrics.sh
```

### Sincronizar Período Específico
```bash
./scripts/sync-meta-ads-metrics.sh --since 2025-01-01 --until 2025-12-31
```

### Simulação (Valida sem sincronizar)
```bash
./scripts/sync-meta-ads-metrics.sh --dry-run
```

### Saída do Script
```
✅ Step 1/4: Sincronizando Conjuntos...
✅ Step 2/4: Sincronizando Criativos...
✅ Step 3/4: Sincronizando Métricas (Conjuntos)...
✅ Step 4/4: Sincronizando Métricas (Criativos)...
✅ Sincronização concluída!
```

---

## 🔐 Permissões

Quem pode acessar:
- ✅ Donos
- ✅ Admins
- ✅ Gerentes
- ❌ Membros (por padrão)

*A page é automaticamente filtrada por organization_id*

---

## 📊 Métricas Disponíveis

**Da Meta API:**
- spend (R$)
- impressions (#)
- clicks (#)
- leads_count (#)
- quality_ranking (ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE)

**Calculadas:**
- CTR (%) = (clicks / impressions) × 100
- CPC (R$) = spend / clicks
- CPL (R$) = spend / leads_count
- CPM (R$) = (spend / impressions) × 1000
- ROAS (×) = revenue / spend

---

## ⏰ Próximos Passos (Futuros)

### Ativar Sincronização Automática (Cron Jobs)

Para sincronizar automaticamente a cada X horas, será necessário:

```sql
-- Exemplo: Sincronizar Ad Sets a cada 6 horas
SELECT cron.schedule(
  'sync-ad-sets-every-6h',
  '0 */6 * * *',
  'SELECT public.sync_ad_sets_cron();'
);

-- Exemplo: Sincronizar Insights a cada 3 horas
SELECT cron.schedule(
  'sync-adset-insights-every-3h',
  '1 1-22/3 * * *',
  'SELECT public.sync_ad_set_insights_cron();'
);

SELECT cron.schedule(
  'sync-ad-insights-every-3h',
  '2 2-23/3 * * *',
  'SELECT public.sync_ad_insights_cron();'
);
```

Vejo a documentação completa em `docs/METRICAS_TRAFFIC_GUIDE.md`

---

## 🐛 Troubleshooting

### "Nenhum conjunto encontrado"
→ Clique "Sincronizar" novamente

### "Sem dados de métrica"
→ Sincronize com período maior (`--since 2025-01-01 --until 2025-12-31`)

### "Erro HTTP 401"
→ Verifique token Meta em `/meta-ads-config`

### Ver Logs de Sincronização
```bash
npx supabase functions logs sync-ad-sets
npx supabase functions logs sync-ads
npx supabase functions logs sync-adset-insights
npx supabase functions logs sync-ad-insights
```

---

## 📚 Documentação

Para detalher completo, veja:
- **[docs/METRICAS_TRAFFIC_GUIDE.md](docs/METRICAS_TRAFFIC_GUIDE.md)** - Guia completo (todo detalhe)

---

## 🎓 Exemplos Práticos

### Exemplo 1: Identificar Criativos com Baixa Performance
```
1. Acesse: /metricas
2. Tab: Overview
3. Veja: "Low Performers" (criativos com >R$50 gasto e 0 leads)
4. Ação: Pausar ou replicar criativo com melhor CPL
```

### Exemplo 2: Comparar 2 Campanhas
```
1. Acesse: /metricas
2. Selecione: Data range (ex: 2025-11-01 a 2025-11-30)
3. Tab: Campanhas
4. Ordene por: ROAS ou CPL
5. Identifique: Melhor campanha do período
```

### Exemplo 3: Análise de A/B Test de Criativos
```
1. Acesse: /metricas
2. Tab: Criativos
3. Compare 2 criativos por CPL (custo por lead)
4. Veja: Quality Ranking de cada um
5. Ação: Aumentar budget do melhor, pausar o pior
```

---

## 💬 Suporte Rápido

| Problema | Solução |
|----------|---------|
| Dados não aparecem | Execute `./scripts/sync-meta-ads-metrics.sh` |
| Período vazio | Sincronize período específico com `--since` e `--until` |
| Erro na sincronização | Verifique logs com `npx supabase functions logs sync-*` |
| Sem conexão Meta | Configure em `/meta-ads-config` |

---

**Status:** ✅ Pronto para usar!

Acesse: http://localhost:8082/metricas
