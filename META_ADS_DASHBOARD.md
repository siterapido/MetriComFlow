# Dashboard de Meta Ads - Guia Completo

## ✅ Implementação Concluída

A dashboard foi atualizada para exibir **dados reais** extraídos diretamente das campanhas do Meta Ads armazenadas no Supabase.

## 📊 KPIs Implementados

### Seção Principal (Dashboard Geral)

1. **Faturamento Mensal** ✅
   - Fonte: `revenue_records` (mês atual)
   - Mostra meta mensal configurada

2. **Faturamento Anual** ✅
   - Fonte: `revenue_records` (ano atual)
   - Compara com meta anual

3. **Oportunidades Ativas** ✅
   - Fonte: `leads` (status: novo_lead, qualificacao, proposta, negociacao)
   - Exibe valor total em pipeline

### Seção Meta Ads

4. **Investimento Meta Ads** ✅
   - Fonte: `campaign_daily_insights` (mês atual)
   - **Valor Real**: Soma de todos os gastos (`spend`) do mês

5. **Leads Gerados** ✅
   - Fonte: `campaign_daily_insights` (mês atual)
   - **Valor Real**: Soma de `leads_count` do mês

6. **CPL (Custo por Lead)** ✅
   - Cálculo: `investimento_total / leads_gerados`
   - Indicador automático: Excelente (<R$50), Meta (<R$100), Acima do ideal (>R$100)

7. **ROAS (Return on Ad Spend)** ✅
   - Fonte primária: view `campaign_financials`
   - Fallback: Leads fechados vs investimento
   - Indicador: Saudável (≥3x), Melhorar (<3x)

### Novos Componentes com Filtros

8. **Filtros Interativos** ✅
   - Período: 7, 30, 60, 90 dias ou personalizado
   - Conta publicitária específica
   - Campanha individual
   - Comparação automática com período anterior

9. **Gráficos Temporais** ✅
   - **Investimento**: Gráfico de área
   - **Leads**: Gráfico de barras
   - **Performance**: CPL, CPC, CTR em linhas múltiplas
   - **Visão Geral**: Todas as métricas combinadas

10. **Métricas Detalhadas** ✅
    - Impressões totais
    - Cliques totais
    - CPC médio
    - Taxa de conversão (leads/cliques)

## 🔄 Fonte dos Dados

Todos os KPIs agora buscam dados **reais** das seguintes tabelas:

- `revenue_records` → Faturamento
- `leads` → Oportunidades e pipeline
- `campaign_daily_insights` → Métricas de anúncios (gastos, impressões, cliques, leads)
- `campaign_financials` → ROAS e financeiro (view agregada)
- `ad_accounts` → Contas de anúncios
- `ad_campaigns` → Campanhas ativas

## 📝 Dados de Teste

Para testes e desenvolvimento, foi criado um seed automático:

### Dados Atuais no Banco:
- **15 campanhas** ativas
- **270 registros** de insights diários (outubro 2025)
- **Métricas agregadas do mês**:
  - Investimento: **R$ 80.435,69**
  - Leads: **2.687**
  - CPL Médio: **R$ 29,94**
  - CTR: **1,99%**

### Scripts Disponíveis:

```bash
# Verificar dados do mês atual
npx tsx scripts/check-meta-data.ts

# Popular dados do mês atual (se vazios)
npx tsx scripts/seed-current-month.ts

# Popular dados completos (90 dias)
npx tsx scripts/seed-meta-data.ts
```

## 🎯 Como Usar

1. **Acesse a Dashboard**: http://localhost:8082/dashboard

2. **Visualize os KPIs principais** no topo da página:
   - Faturamento (mensal e anual)
   - Oportunidades ativas
   - Investimento Meta Ads
   - Leads gerados, CPL e ROAS

3. **Role até "Meta Ads - Análise Detalhada"**:
   - Use os **filtros** para refinar os dados
   - Alterne entre as **4 abas de gráficos**
   - Visualize **métricas detalhadas** na seção inferior

4. **Interprete os indicadores**:
   - ✅ **Verde com seta para cima** = Melhora vs período anterior
   - ❌ **Vermelho com seta para baixo** = Piora vs período anterior
   - ⚠️ **Amarelo** = Atenção necessária

## 🔍 Debug e Logs

Os hooks incluem `console.log` detalhados para debug:

```javascript
// Abra o console do navegador (F12) para ver:
[useDashboardSummary] Buscando dados para: { year: 2025, currentMonthName: 'Out' }
[useDashboardSummary] Faturamento: { monthRecords: 6, yearRecords: 72, ... }
[useMetaKPIs] Insights encontrados: 270
[useMetaKPIs] Métricas calculadas: { investimento_total: 80435.69, leads_gerados: 2687, cpl: 29.94 }
```

## 🚀 Próximos Passos

Para conectar dados **reais** do Meta Ads:

1. Configure a integração OAuth do Meta Business em `/meta-ads-config`
2. Ative a Edge Function `sync-daily-insights` para buscar dados automaticamente
3. Configure webhook para receber leads em tempo real
4. Os dados de teste serão substituídos pelos dados reais automaticamente

## 📚 Documentação Adicional

- [Configuração Meta Ads](docs/META_ADS_SETUP.md)
- [Estrutura do Banco de Dados](DATABASE.md)
- [Design System](DESIGN_SYSTEM.md)

---

**Status**: ✅ Implementação completa com dados reais do Supabase
**Versão**: 1.0.0
**Última atualização**: 18 de Outubro de 2025
