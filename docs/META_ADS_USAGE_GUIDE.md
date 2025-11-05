# Guia de Uso - Métricas Meta Ads - InsightFy

## 📋 Índice

1. [Introdução](#introdução)
2. [Primeiros Passos](#primeiros-passos)
3. [Estrutura de Dados](#estrutura-de-dados)
4. [Como Sincronizar Dados](#como-sincronizar-dados)
5. [Navegação e Filtros](#navegação-e-filtros)
6. [Métricas Disponíveis](#métricas-disponíveis)
7. [Quality Rankings](#quality-rankings)
8. [Análise de Criativos](#análise-de-criativos)
9. [Sincronização Automática](#sincronização-automática)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## 🚀 Introdução

O módulo de **Métricas Meta Ads** do InsightFy permite análise detalhada de performance de campanhas publicitárias do Facebook/Instagram em 3 níveis:

- **Campanhas**: Visão geral do objetivo de marketing
- **Conjuntos de Anúncios**: Segmentação e orçamento
- **Criativos**: Performance individual de cada peça criativa

**Benefícios:**
- ✅ Centralizar dados do Meta Ads em uma única plataforma
- ✅ Analisar performance por campanha, conjunto e criativo
- ✅ Identificar criativos com melhor ROI
- ✅ Otimizar orçamento baseado em dados reais
- ✅ Acompanhar quality rankings do Meta

---

## 🎯 Primeiros Passos

### 1. Conectar Conta Meta

1. Acesse **Métricas de Tráfego** no menu lateral
2. Clique em **"Contas Meta"** (botão no topo)
3. Faça login com sua conta Meta Business
4. Selecione as contas publicitárias que deseja conectar
5. Aguarde a confirmação

**Importante**: Você precisa ter permissões de **Anunciante** ou **Analista** na conta Meta Business.

### 2. Primeira Sincronização

Após conectar a conta, clique em **"Sincronizar"** para importar:

- ✅ Campanhas ativas e pausadas
- ✅ Conjuntos de anúncios
- ✅ Criativos (imagens, vídeos, carrosséis)
- ✅ Métricas dos últimos 90 dias

**Tempo estimado**: 2-10 minutos (dependendo do volume de dados).

### 3. Verificar Dados

Após a sincronização, navegue pelas abas:

- **Overview**: Resumo geral e top performers
- **Campanhas**: Lista de todas as campanhas
- **Conjuntos**: Segmentação e orçamento por conjunto
- **Criativos**: Performance individual de cada criativo

---

## 📊 Estrutura de Dados

### Hierarquia

```
Conta de Anúncios
  └─ Campanhas (Objetivo de Marketing)
      └─ Conjuntos de Anúncios (Segmentação + Orçamento)
          └─ Criativos (Imagens/Vídeos)
```

### Exemplo Prático

```
Conta: "Minha Empresa Ltda"
  ├─ Campanha: "Black Friday 2025" (Objetivo: Conversões)
  │   ├─ Conjunto: "Público Quente - SP" (Orçamento: R$ 100/dia)
  │   │   ├─ Criativo 1: "Video Black Friday 30s"
  │   │   ├─ Criativo 2: "Imagem Promocional 1"
  │   │   └─ Criativo 3: "Carrossel Produtos"
  │   └─ Conjunto: "Lookalike Compradores"
  │       └─ Criativo 4: "Video Depoimentos"
  └─ Campanha: "Tráfego Evergreen"
      └─ ...
```

### O que cada nível mostra

| Nível | O que é | Exemplo de Análise |
|-------|---------|-------------------|
| **Campanha** | Objetivo de marketing (conversões, tráfego, alcance) | "Qual campanha tem melhor ROI?" |
| **Conjunto** | Segmentação (público, localização, idade) + Orçamento | "Qual segmentação converte mais?" |
| **Criativo** | Peça criativa individual (imagem, vídeo) | "Qual arte gera mais cliques?" |

---

## 🔄 Como Sincronizar Dados

### Sincronização Manual

**Quando usar:**
- Primeira vez que conecta uma conta
- Após criar novas campanhas no Meta
- Quando dados parecem desatualizados

**Como fazer:**
1. Acesse **Métricas de Tráfego**
2. Clique em **"Sincronizar"** (botão com ícone de refresh)
3. Aguarde a conclusão (progresso mostrado em toast)

**O que é sincronizado:**
- Estrutura: Campanhas, Conjuntos, Criativos
- Métricas: Últimos 30 dias (padrão) ou período selecionado

### Sincronização Automática

**Quando ocorre:**
- Todos os dias às **3 AM** (horário do servidor)
- Sincroniza automaticamente os últimos 7 dias

**O que é sincronizado automaticamente:**
- ✅ Novos conjuntos e criativos
- ✅ Métricas dos últimos 7 dias
- ✅ Quality rankings atualizados
- ❌ Campanhas (precisa sincronizar manualmente após criar nova campanha)

**Status de Sincronização:**

Na parte superior da página, você verá um indicador:

- 🟢 **Atualizado**: Sincronizado nas últimas 6 horas
- 🟡 **Recente**: Sincronizado nas últimas 48 horas
- 🔴 **Desatualizado**: Mais de 48 horas sem sincronizar
- ⚪ **Nunca sincronizado**: Clique em "Sincronizar"

---

## 🎛️ Navegação e Filtros

### Filtros Disponíveis

| Filtro | Descrição | Exemplo de Uso |
|--------|-----------|----------------|
| **Período** | Data inicial e final | "Últimos 30 dias", "Janeiro 2025" |
| **Conta** | Conta publicitária | "Empresa A", "Todas as contas" |
| **Campanha** | Campanha específica | "Black Friday", "Todas as campanhas" |
| **Conjunto** | Conjunto de anúncios | "Público SP", "Todos os conjuntos" |

### Como Usar Filtros

**Exemplo 1: Analisar campanha específica**
1. Selecione a **Conta**
2. Selecione a **Campanha** desejada
3. Vá para a aba **Conjuntos** ou **Criativos**

**Exemplo 2: Comparar todas as campanhas**
1. Deixe filtros em "Todas as contas" e "Todas as campanhas"
2. Vá para a aba **Campanhas**
3. Ordene por "Leads" ou "Gasto"

**Exemplo 3: Encontrar criativos de baixa performance**
1. Selecione **Período** (ex: últimos 30 dias)
2. Vá para a aba **Overview**
3. Veja o alerta de "Criativos com gasto > R$ 50 e zero leads"

---

## 📈 Métricas Disponíveis

### Métricas Principais

| Métrica | Descrição | Fórmula | Bom Valor |
|---------|-----------|---------|-----------|
| **Gasto** | Total investido | Soma de spend | - |
| **Impressões** | Vezes que o anúncio foi exibido | - | > 10.000 |
| **Cliques** | Cliques nos anúncios | - | > 100 |
| **Leads** | Conversões (formulários, WhatsApp) | - | > 10 |
| **CPL** | Custo por Lead | Gasto ÷ Leads | < R$ 50 |
| **CTR** | Taxa de Cliques (%) | (Cliques ÷ Impressões) × 100 | > 1% |
| **CPC** | Custo por Clique | Gasto ÷ Cliques | < R$ 5 |
| **CPM** | Custo por Mil Impressões | (Gasto ÷ Impressões) × 1000 | R$ 10-30 |

### Métricas Adicionais (Conjuntos e Criativos)

| Métrica | Descrição | Disponível em |
|---------|-----------|---------------|
| **Alcance** | Pessoas únicas alcançadas | Conjuntos, Criativos |
| **Frequência** | Vezes que mesma pessoa viu o anúncio | Conjuntos, Criativos |
| **Link Clicks** | Cliques no link do anúncio | Conjuntos, Criativos |
| **Video Views** | Visualizações de vídeo | Criativos (vídeo) |

---

## 🏆 Quality Rankings

### O que são?

O Meta fornece 3 rankings de qualidade para cada criativo:

1. **Quality Ranking** (Qualidade)
   - Avalia relevância e qualidade do criativo
   - Compara com outros anúncios competindo pela mesma audiência

2. **Engagement Ranking** (Engajamento)
   - Avalia taxa de interação (curtidas, comentários, compartilhamentos)

3. **Conversion Ranking** (Conversão)
   - Avalia eficiência em gerar conversões

### Valores Possíveis

| Ranking | Significado | Ação Recomendada |
|---------|-------------|------------------|
| 🟢 **Acima da Média** | Criativo performando muito bem | Aumentar orçamento |
| 🟡 **Média** | Performance padrão | Monitorar |
| 🔴 **Abaixo da Média** | Performance ruim | **Pausar ou trocar criativo** |

### Como Visualizar

**Aba Criativos:**
- Cada criativo mostra badges coloridos com os 3 rankings
- Clique no criativo para ver detalhes

**Aba Overview:**
- Criativos com ranking "Abaixo da Média" aparecem no alerta no topo

### Dicas de Otimização

**Ranking baixo?**
1. ✅ Teste novo criativo (imagem/vídeo diferente)
2. ✅ Revise copy (título, descrição, CTA)
3. ✅ Verifique targeting (público pode ser errado)
4. ✅ Pause criativo se gasto > R$ 100 sem resultados

**Ranking alto?**
1. ✅ Aumente orçamento do conjunto
2. ✅ Teste variações do criativo (A/B testing)
3. ✅ Expanda para públicos similares

---

## 🎨 Análise de Criativos

### Visualização de Criativos

**Como ver thumbnails:**
1. Acesse a aba **Criativos**
2. Cada linha mostra um thumbnail pequeno
3. **Clique no thumbnail** para abrir preview em tela cheia

**Preview em Tela Cheia:**
- 🖼️ Imagem ou vídeo (com play automático)
- 📝 Título, Descrição, Call to Action
- 📊 Tipo de criativo (IMAGE, VIDEO, CAROUSEL)

### Tipos de Criativos

| Tipo | Descrição | Exemplo de Uso |
|------|-----------|----------------|
| **IMAGE** | Imagem estática | Promoção de produto |
| **VIDEO** | Vídeo curto ou longo | Depoimento, tutorial |
| **CAROUSEL** | Várias imagens/vídeos | Catálogo de produtos |
| **COLLECTION** | Galeria de produtos | E-commerce |

### Top Performers (Overview)

**Top 5 Criativos - Leads:**
- Criativos que mais geraram leads no período
- Ordenado por quantidade de leads (maior → menor)
- Mostra: Nome, Tipo, Leads, CPL

**Top 5 Criativos - CTR:**
- Criativos com melhor taxa de cliques
- Ordenado por CTR (maior → menor)
- Mostra: Nome, Cliques, CTR, Impressões

### Identificação de Low Performers

**Alerta Automático:**
- Criativos com **gasto > R$ 50** e **zero leads**
- Aparecem no topo da aba **Overview**
- **Ação recomendada**: Pausar imediatamente

---

## 🤖 Sincronização Automática

### Como Funciona

**Horário:**
- Todos os dias às **3 AM** (horário do servidor)

**O que é sincronizado:**
- ✅ Novos conjuntos de anúncios criados
- ✅ Novos criativos adicionados
- ✅ Métricas dos **últimos 7 dias** (atualização incremental)
- ✅ Quality rankings mais recentes

**Logs de Sincronização:**
- Cada execução é registrada no sistema
- Admins podem consultar logs no SQL Editor (tabela `meta_sync_logs`)

### Configuração Avançada (Admins)

**Verificar cron jobs ativos:**
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'sync-%';
```

**Forçar sincronização manual (via SQL):**
```sql
SELECT invoke_edge_function_with_log('manual-sync', 'sync-ad-sets-cron');
```

**Desabilitar sincronização automática:**
```sql
SELECT cron.unschedule('sync-ad-sets-daily');
SELECT cron.unschedule('sync-ads-daily');
SELECT cron.unschedule('sync-adset-insights-daily');
SELECT cron.unschedule('sync-ad-insights-daily');
```

---

## 🛠️ Troubleshooting

### Problema: Dados não aparecem

**Sintomas:**
- Tabelas vazias após conectar conta
- Nenhuma campanha listada

**Possíveis Causas:**
1. Sincronização não foi executada
2. Conta Meta sem campanhas ativas
3. Período de filtro muito restrito

**Soluções:**
1. ✅ Clique em **"Sincronizar"** e aguarde conclusão
2. ✅ Verifique no Meta Ads Manager se há campanhas ativas
3. ✅ Amplie o período de filtro (ex: últimos 90 dias)
4. ✅ Execute diagnóstico SQL (ver `scripts/diagnostico-meta-ads.sql`)

---

### Problema: Sincronização muito lenta

**Sintomas:**
- Sincronização demora mais de 10 minutos
- Timeout errors

**Possíveis Causas:**
- Conta com muitas campanhas (>100)
- Meta API com rate limiting
- Período muito longo (>180 dias)

**Soluções:**
1. ✅ Filtrar por **conta específica** ao invés de "Todas"
2. ✅ Reduzir período de sincronização (ex: últimos 30 dias)
3. ✅ Aguardar 5-10 minutos e tentar novamente
4. ✅ Verificar logs de erro no Supabase Dashboard

---

### Problema: Access token expired

**Sintomas:**
- Erro: "Invalid OAuth access token"
- Sincronização falha com erro 401

**Solução:**
1. ✅ Acesse **Contas Meta**
2. ✅ Clique em **"Desconectar"**
3. ✅ Reconecte a conta (novo OAuth flow)
4. ✅ Execute sincronização manual

**Nota**: Tokens do Meta expiram após 60 dias. Recomenda-se reconectar mensalmente.

---

### Problema: Métricas zeradas

**Sintomas:**
- Campanhas aparecem mas métricas estão em zero
- Gasto = R$ 0, Leads = 0

**Possíveis Causas:**
1. Período selecionado sem dados
2. Campanhas não estavam ativas no período
3. Sincronização de métricas falhou

**Soluções:**
1. ✅ Amplie o período de filtro
2. ✅ Verifique no Meta Ads Manager se campanhas tiveram gasto
3. ✅ Execute sincronização manual (botão "Sincronizar")
4. ✅ Verifique tabela `ad_set_daily_insights` no SQL Editor

---

### Problema: Quality rankings não aparecem

**Sintomas:**
- Criativos sem badges de qualidade
- Todos mostram "Rankings não disponíveis"

**Possíveis Causas:**
- Meta só fornece rankings após volume mínimo de impressões
- Criativos muito recentes (<48h)
- Sincronização de insights não executada

**Soluções:**
1. ✅ Aguarde 2-3 dias após lançar criativo
2. ✅ Execute sincronização manual
3. ✅ Verifique se criativo tem impressões suficientes (>1000)

---

## ❓ FAQ

**P: Posso conectar múltiplas contas Meta?**
R: Sim! Conecte quantas contas quiser. Use o filtro "Conta" para alternar entre elas.

**P: Os dados são sincronizados em tempo real?**
R: Não. Dados são atualizados via sincronização manual ou automática (diária às 3 AM).

**P: Qual o limite de dados históricos?**
R: Meta API permite até 37 meses de histórico. Recomendamos sincronizar últimos 90 dias.

**P: Posso exportar dados para Excel?**
R: Não nativamente. Sugestão: use SQL Editor para exportar CSV.

**P: Por que alguns criativos não têm thumbnail?**
R: Meta pode não fornecer URL de imagem para alguns tipos de criativos (ex: Dynamic Ads).

**P: Como pausar um criativo direto no InsightFy?**
R: Não é possível. Você precisa pausar no Meta Ads Manager. InsightFy é apenas leitura.

**P: Dados de Instagram Stories são incluídos?**
R: Sim! Todos os posicionamentos (Facebook, Instagram, Audience Network) são incluídos.

**P: Posso ver dados de contas antigas desconectadas?**
R: Não. Ao desconectar uma conta, os dados são mantidos mas não serão atualizados.

---

## 📞 Suporte

**Problemas técnicos:**
- Execute o diagnóstico SQL: `scripts/diagnostico-meta-ads.sql`
- Verifique logs no Supabase: Edge Functions → Logs
- Contate o administrador do sistema

**Documentação técnica:**
- Ver `CLAUDE.md` (seção "Meta Ads Integration")
- Ver `scripts/README.md` (scripts de sincronização)
- Ver `docs/META_ADS_SETUP.md` (configuração inicial)

---

**Versão**: 1.0
**Última atualização**: Dezembro 2025
