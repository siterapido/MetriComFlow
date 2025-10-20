# 🎯 Guia Completo: Metas para Meta Ads

## Visão Geral

O sistema de metas agora está totalmente integrado com Meta Ads, permitindo criar e acompanhar objetivos baseados em **11 métricas diferentes** de suas campanhas publicitárias.

## 📊 Métricas Disponíveis

### 1. **ROAS** (Return on Ad Spend)
- **O que mede**: Retorno sobre investimento em anúncios
- **Fórmula**: Receita gerada / Investimento em anúncios
- **Quando usar**: Para avaliar eficiência de campanhas de conversão
- **Meta ideal**: ROAS > 3.0 (cada R$ 1 investido retorna R$ 3)

### 2. **CPL** (Custo por Lead)
- **O que mede**: Quanto custa para gerar um lead
- **Fórmula**: Investimento / Total de leads
- **Quando usar**: Para campanhas de captação de leads
- **Meta ideal**: Depende do ticket médio (geralmente < 10% do valor do produto)

### 3. **CPC** (Custo por Clique)
- **O que mede**: Quanto custa cada clique no anúncio
- **Fórmula**: Investimento / Total de cliques
- **Quando usar**: Para avaliar eficiência do anúncio em gerar interesse
- **Meta ideal**: R$ 0.50 - R$ 2.00 (varia por segmento)

### 4. **CPM** (Custo por Mil Impressões)
- **O que mede**: Custo para alcançar 1.000 pessoas
- **Fórmula**: (Investimento / Impressões) × 1.000
- **Quando usar**: Para campanhas de brand awareness
- **Meta ideal**: R$ 5.00 - R$ 20.00 (depende do público)

### 5. **Investimento Total**
- **O que mede**: Quanto foi investido em anúncios
- **Quando usar**: Para controle de budget mensal
- **Meta ideal**: Definido conforme orçamento disponível

### 6. **Leads Gerados**
- **O que mede**: Quantidade de leads capturados
- **Quando usar**: Para medir volume de captação
- **Meta ideal**: Baseado em histórico e capacidade de atendimento

### 7. **Impressões**
- **O que mede**: Quantas vezes os anúncios foram visualizados
- **Quando usar**: Para campanhas de alcance e awareness
- **Meta ideal**: Depende do objetivo (geralmente > 100.000/mês)

### 8. **Cliques**
- **O que mede**: Quantas vezes clicaram no anúncio
- **Quando usar**: Para medir engajamento inicial
- **Meta ideal**: Proporcional às impressões (CTR > 1%)

### 9. **CTR** (Click-Through Rate)
- **O que mede**: Taxa de cliques sobre impressões
- **Fórmula**: (Cliques / Impressões) × 100
- **Quando usar**: Para avaliar qualidade do criativo
- **Meta ideal**: > 1% (varia por formato)

### 10. **Frequência**
- **O que mede**: Quantas vezes cada pessoa viu o anúncio
- **Fórmula**: Impressões / Alcance
- **Quando usar**: Para evitar saturação de público
- **Meta ideal**: 2-4 (evitar > 6 para não cansar a audiência)

### 11. **Alcance**
- **O que mede**: Quantidade de pessoas únicas alcançadas
- **Quando usar**: Para campanhas de awareness
- **Meta ideal**: Depende do tamanho do público-alvo

## 🎯 Como Criar Metas para Meta Ads

### Passo a Passo

1. **Acesse Metas**
   - Vá para `/metas` no menu
   - Clique em **"Nova Meta"**

2. **Preencha Informações Básicas**
   ```
   Título: Meta de CPL - Novembro
   Descrição: Reduzir custo por lead para campanhas de Black Friday
   ```

3. **Selecione o KPI**
   - Digite "cpl" na busca, ou
   - Clique em "Meta Ads" nos filtros
   - Escolha **"CPL (Custo por Lead)"**

4. **Configure Filtros (Opcional)**
   - **Conta de Anúncios**: Escolha uma conta específica ou "Todas as contas"
   - **Campanha**: Se selecionou uma conta, pode filtrar por campanha específica
   - **Sem filtros**: Meta considera todas as campanhas de todas as contas

5. **Defina Valor Alvo**
   ```
   Valor Alvo: R$ 50,00
   (sistema calculará automaticamente o CPL real dos anúncios)
   ```

6. **Selecione Período**
   ```
   Data Início: 01/11/2025
   Data Fim: 30/11/2025
   Tipo de Período: Mensal
   ```

7. **Criar Meta**
   - Clique em **"Criar Meta"**
   - Sistema calculará o progresso automaticamente

## 🔄 Sincronização Automática

O sistema calcula o progresso das metas de Meta Ads em tempo real:

### Como Funciona

1. **Fonte de Dados**: `campaign_daily_insights` (dados diários das campanhas)
2. **Atualização**: Automática sempre que você abre a página de metas
3. **Cálculo**: Baseado no período definido e nos filtros aplicados
4. **Refetch Manual**: Botão "Recalcular Todas" disponível

### Exemplos de Cálculo

**Exemplo 1: CPL Filtrado por Campanha**
```
Meta: CPL = R$ 50,00
Filtros: Campanha "Black Friday"
Período: 01/11 - 30/11

Cálculo:
- Investimento da campanha: R$ 5.000,00
- Leads gerados: 120
- CPL Real: R$ 5.000 / 120 = R$ 41,67
- Progresso: (50 - 41,67) / 50 × 100 = 16.66% acima da meta ✅
```

**Exemplo 2: ROAS Geral**
```
Meta: ROAS = 3.0
Filtros: Todas as contas
Período: 01/11 - 30/11

Cálculo:
- Investimento total: R$ 10.000,00
- Receita gerada (CRM): R$ 35.000,00
- ROAS Real: R$ 35.000 / R$ 10.000 = 3.5
- Progresso: 116.67% da meta ✅
```

## 📈 Interpretando os Status

### Status da Meta

- **Excelente** (Verde): > 110% da meta
- **Em dia** (Azul): 90-110% da meta
- **Atrasado** (Amarelo): 70-90% da meta
- **Crítico** (Vermelho): < 70% da meta

### Barra de Progresso

```
┌────────────────────────────────────┐
│ ████████████████░░░░░░░░░░░░  75% │
│ R$ 37,50 / R$ 50,00               │
└────────────────────────────────────┘
```

- **Verde cheio**: Progresso atual
- **Cinza vazio**: Falta para atingir a meta
- **Número**: Porcentagem de conclusão

## 🎨 Casos de Uso Práticos

### Caso 1: Controle de Budget Mensal

```yaml
Meta: Investimento Total
Valor Alvo: R$ 15.000,00
Período: Mensal
Filtros: Todas as contas
Objetivo: Não ultrapassar o orçamento aprovado
```

**Por que usar**: Evita gastos excessivos e permite ajustes durante o mês.

### Caso 2: Eficiência de Campanha de Leads

```yaml
Meta: CPL
Valor Alvo: R$ 40,00
Período: Mensal
Filtros: Campanha "Captação Novembro"
Objetivo: Manter custo por lead abaixo do histórico
```

**Por que usar**: Otimizar campanhas comparando com benchmark interno.

### Caso 3: Qualidade do Criativo

```yaml
Meta: CTR
Valor Alvo: 1.5%
Período: Semanal
Filtros: Campanha "Teste A/B Criativos"
Objetivo: Validar qual criativo performa melhor
```

**Por que usar**: Identificar criativos com melhor engajamento.

### Caso 4: Saturação de Público

```yaml
Meta: Frequência
Valor Alvo: 3.0
Período: Semanal
Filtros: Campanha "Retargeting"
Objetivo: Evitar cansar o público
```

**Por que usar**: Prevenir fadiga de anúncio e redução de performance.

### Caso 5: ROI Geral

```yaml
Meta: ROAS
Valor Alvo: 4.0
Período: Mensal
Filtros: Todas as campanhas
Objetivo: Garantir rentabilidade dos anúncios
```

**Por que usar**: Visão macro da eficiência do investimento em ads.

## 🔧 Filtros Avançados

### Hierarquia de Filtros

```
Nível 1: Todas as contas
  └─ Todas as campanhas
     └─ Todos os dados

Nível 2: Conta específica
  └─ Todas as campanhas da conta
     └─ Dados filtrados por conta

Nível 3: Conta + Campanha específica
  └─ Dados de uma campanha única
     └─ Máxima granularidade
```

### Quando Usar Cada Nível

**Todas as contas**:
- Metas gerais da empresa
- Controle de budget total
- ROAS consolidado

**Conta específica**:
- Comparar performance entre contas
- Metas por marca/produto
- Budget por vertical

**Campanha específica**:
- Otimização de campanha individual
- Testes A/B
- Metas de eventos específicos (Black Friday, Natal, etc.)

## 📊 Dashboard de Metas

### Visualização por Categoria

As metas são agrupadas automaticamente:

```
┌─ Meta Ads (7 metas) ────────────┐
│ □ CPL Black Friday - 85% ✅     │
│ □ ROAS Geral - 112% ✅          │
│ □ CTR Novos Criativos - 45% ⚠️ │
│ ...                              │
└──────────────────────────────────┘

┌─ CRM (3 metas) ─────────────────┐
│ □ Faturamento Novembro - 78% ✅ │
│ ...                              │
└──────────────────────────────────┘
```

### Ações Disponíveis

- **Ver Detalhes**: Histórico de progresso
- **Editar**: Ajustar meta ou filtros
- **Recalcular**: Forçar atualização dos dados
- **Arquivar**: Mover para histórico

## 🚨 Troubleshooting

### Meta não calcula progresso

**Problema**: Meta criada mas progresso está em 0%

**Causas possíveis**:
1. Não há dados de Meta Ads no período selecionado
2. Campanha selecionada não existe ou foi deletada
3. Dados ainda não foram sincronizados

**Solução**:
1. Verifique se a campanha tem dados em `/meta-ads-config`
2. Clique em "Recalcular" na meta
3. Ajuste o período para incluir dias com dados

### Valor calculado está incorreto

**Problema**: O valor mostrado não corresponde aos dados do Meta

**Causas possíveis**:
1. Filtros aplicados estão restringindo demais
2. Período não está correto
3. Dados não sincronizados recentemente

**Solução**:
1. Confira os filtros de conta e campanha
2. Verifique o período (início e fim)
3. Force sincronização em `/meta-ads-config`
4. Recalcule a meta

### Meta não aparece na lista

**Problema**: Meta criada mas não está visível

**Causas possíveis**:
1. Status da meta pode estar como "arquivada"
2. Filtro de tab ativa/completa

**Solução**:
1. Verifique a tab "Todas"
2. Edite a meta e altere status para "active"

## 🎯 Melhores Práticas

### 1. Defina Metas Realistas

```
❌ Ruim: CPL = R$ 10,00 (histórico é R$ 50,00)
✅ Bom: CPL = R$ 45,00 (5% de melhoria)
```

### 2. Use Períodos Adequados

```
CPL, ROAS, CTR → Mensal
Frequência → Semanal
Investimento → Mensal ou Trimestral
```

### 3. Combine com Metas de CRM

```
Meta 1: Leads (Meta Ads) = 500
Meta 2: Conversão (CRM) = 50
Meta 3: Faturamento (CRM) = R$ 100.000
```

### 4. Revise Semanalmente

- Segunda-feira: Revisar metas ativas
- Ajustar estratégias se estiver < 25% no meio do mês
- Pausar campanhas se frequência > 5

### 5. Documente Mudanças

Use o campo "Descrição" para contexto:
```
Descrição: Meta reduzida de R$ 60 para R$ 50 após
otimização de público em 15/11. Esperamos atingir
até fim do mês.
```

## 📚 Referências Rápidas

### Metas Sugeridas por Segmento

**E-commerce:**
- ROAS: 4.0+
- CPL: R$ 30-60
- CTR: 1.5%+

**Serviços B2B:**
- CPL: R$ 50-150
- ROAS: 3.0+
- Frequência: 2-4

**Infoprodutos:**
- CPL: R$ 10-30
- ROAS: 5.0+
- CTR: 2%+

**Imobiliário:**
- CPL: R$ 100-300
- CTR: 0.8%+
- Investimento: R$ 10.000+/mês

---

**Versão**: 1.0.0
**Data**: Outubro 2025
**Desenvolvido para**: Metricom Flow CRM
**Integração**: Meta Ads + Supabase + CRM unificado
