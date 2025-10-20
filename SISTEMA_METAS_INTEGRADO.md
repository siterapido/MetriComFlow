# Sistema de Metas Integrado - Metricom Flow

## 📋 Visão Geral

Sistema completo de metas personalizadas totalmente integrado ao CRM, Meta Ads e sistema de receitas. Permite criar metas baseadas em qualquer KPI da plataforma com cálculo automático de progresso em tempo real.

## ✨ Funcionalidades

### Tipos de Metas Suportadas

#### 🔷 CRM
- **Faturamento**: Receita gerada por leads fechados
- **Leads Gerados**: Total de leads criados no período
- **Leads Convertidos**: Leads que fecharam negócio
- **Taxa de Conversão**: Percentual de leads convertidos
- **Valor do Pipeline**: Valor total de oportunidades ativas
- **Ticket Médio**: Valor médio de negócios fechados

#### 🟢 Meta Ads
- **ROAS**: Retorno sobre investimento em anúncios
- **CPL**: Custo por lead
- **Investimento Total**: Valor investido em anúncios
- **Leads Gerados**: Total de leads do Meta Ads
- **Impressões**: Total de visualizações
- **Cliques**: Total de cliques
- **CTR**: Taxa de cliques (Click-Through Rate)

#### 🟣 Receita
- **Receita Total**: Soma de todas as receitas
- **Receita por Categoria**: Receita filtrada por categoria (new_up, clientes, oportunidades)

#### 🟠 Personalizado
- **Metas Customizadas**: Defina suas próprias métricas e fórmulas

### Características

- ✅ **Cálculo Automático**: Progresso atualizado automaticamente com dados em tempo real
- ✅ **Filtros Avançados**: Filtre por conta Meta Ads, campanha, categoria de receita
- ✅ **Múltiplos Períodos**: Diário, semanal, mensal, trimestral, anual ou personalizado
- ✅ **Status Inteligente**: Classificação automática (Excelente, Em dia, Atrasado, Crítico)
- ✅ **Histórico de Progresso**: Rastreamento completo da evolução das metas
- ✅ **Real-time Updates**: Atualizações automáticas via Supabase Realtime
- ✅ **Indicadores Visuais**: Visualize se está acima, abaixo ou no ritmo da meta
- ✅ **Agrupamento por Categoria**: Organização automática por tipo de KPI

## 🚀 Instalação

### 1. Aplicar a Migration

**Opção A: Via Supabase Dashboard (Recomendado)**

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie e execute o conteúdo do arquivo:
   ```
   supabase/migrations/20251020_unified_goals_system.sql
   ```

**Opção B: Via Supabase CLI**

```bash
# Se ainda não aplicou, repare as migrations antigas
npx supabase migration repair --status applied [lista de migrations antigas]

# Aplique a nova migration
npx supabase db push
```

### 2. Atualizar o Roteamento

Atualize o arquivo de rotas para incluir a nova página de metas:

**`src/App.tsx`:**

```typescript
import MetasNew from '@/pages/MetasNew'

// Nas rotas protegidas:
<Route path="/metas" element={<MetasNew />} />
```

Ou, se preferir substituir a página antiga:

```bash
mv src/pages/Metas.tsx src/pages/Metas.old.tsx
mv src/pages/MetasNew.tsx src/pages/Metas.tsx
```

### 3. Atualizar Database Types

```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

## 📖 Como Usar

### Criar Uma Nova Meta

1. Acesse a página **Metas** no menu lateral
2. Clique em **"Nova Meta"**
3. Preencha o formulário:
   - **Título**: Nome descritivo da meta
   - **Tipo de KPI**: Selecione o tipo de métrica
   - **Valor Alvo**: Meta a ser atingida
   - **Período**: Data de início e fim
   - **Filtros** (opcional): Configure filtros específicos para Meta Ads ou Receita

4. Clique em **"Criar Meta"**

O sistema irá:
- Criar a meta no banco de dados
- Calcular automaticamente o valor inicial
- Começar a rastrear o progresso em tempo real

### Atualizar Progresso

O progresso é calculado automaticamente, mas você pode forçar uma atualização:

**Atualizar uma meta específica:**
- Clique no menu ⋮ no card da meta
- Selecione **"Atualizar Progresso"**

**Atualizar todas as metas:**
- Clique em **"Atualizar Todas"** no cabeçalho da página

### Editar Uma Meta

1. Clique no menu ⋮ no card da meta
2. Selecione **"Editar"**
3. Modifique os campos desejados
4. Clique em **"Atualizar Meta"**

### Excluir Uma Meta

1. Clique no menu ⋮ no card da meta
2. Selecione **"Excluir"**
3. Confirme a exclusão

**Nota**: O histórico de progresso também será excluído.

## 🎯 Exemplos de Uso

### Exemplo 1: Meta de Faturamento Mensal

```
Título: Faturamento Outubro 2025
Tipo: CRM → Faturamento (CRM)
Valor Alvo: R$ 500.000,00
Período: 01/10/2025 - 31/10/2025
```

O sistema irá:
- Somar todos os leads com status "fechado_ganho"
- Calcular o valor total fechado no período
- Atualizar o progresso automaticamente

### Exemplo 2: Meta de CPL para Campanha Específica

```
Título: CPL - Campanha Black Friday
Tipo: Meta Ads → CPL (Custo por Lead)
Valor Alvo: R$ 50,00
Período: 01/11/2025 - 30/11/2025
Filtros:
  - Conta: Conta Principal
  - Campanha: Black Friday 2025
```

O sistema irá:
- Calcular o CPL apenas para a campanha selecionada
- Atualizar diariamente com os dados do Meta Ads
- Alertar se o CPL ultrapassar a meta

### Exemplo 3: Meta de ROAS Trimestral

```
Título: ROAS Q4 2025
Tipo: Meta Ads → ROAS
Valor Alvo: 3.5 (R$ 3,50 de retorno para cada R$ 1,00 investido)
Período: 01/10/2025 - 31/12/2025
Filtros:
  - Conta: Todas as contas
```

O sistema irá:
- Calcular investimento total em todas as contas Meta Ads
- Somar receita de todos os leads fechados
- Calcular ROAS = Receita / Investimento
- Atualizar em tempo real conforme novos fechamentos

## 🔧 Integração com Dashboard

Para integrar as metas no dashboard principal, adicione este componente:

```typescript
import { useGoals } from '@/hooks/useGoals'
import { GoalCard } from '@/components/goals/GoalCard'

function DashboardGoalsWidget() {
  const { data: goals } = useGoals({ status: 'active' })
  const topGoals = (goals || []).slice(0, 3) // 3 principais

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Metas Principais</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  )
}
```

## 📊 Cálculo Automático de Progresso

### Como Funciona

1. **Criação da Meta**: Ao criar uma meta, o valor inicial é capturado
2. **Cálculo Periódico**: O hook `useCalculateGoalProgress` busca dados das fontes relevantes
3. **Atualização Automática**: O valor atual é calculado e armazenado
4. **Status Automático**: O banco calcula automaticamente:
   - **Progresso**: `(current_value - start_value) / (target_value - start_value) * 100`
   - **Status**: Baseado no progresso (Excelente ≥ 95%, Em dia ≥ 70%, Atrasado ≥ 50%, Crítico < 50%)

### Fontes de Dados por Tipo

| Tipo de Meta | Tabela(s) Consultada(s) | Filtros Aplicados |
|--------------|------------------------|-------------------|
| `crm_revenue` | `leads` | `status = 'fechado_ganho'` no período |
| `crm_leads_generated` | `leads` | `created_at` no período |
| `crm_leads_converted` | `leads` | `status = 'fechado_ganho'` no período |
| `crm_conversion_rate` | `leads` | Leads fechados / total de leads |
| `crm_pipeline_value` | `leads` | `status IN (novo_lead, qualificacao, proposta, negociacao)` |
| `meta_roas` | `campaign_daily_insights`, `leads` | Receita / Investimento |
| `meta_cpl` | `campaign_daily_insights` | Investimento / Leads gerados |
| `meta_investment` | `campaign_daily_insights` | Soma de `spend` |
| `meta_leads` | `campaign_daily_insights` | Soma de `leads_count` |
| `revenue_total` | `revenue_records` | Período e ano |
| `revenue_by_category` | `revenue_records` | Categoria específica |

## 🔐 Segurança

- **RLS (Row Level Security)**: Todas as tabelas têm políticas de segurança
- **Autenticação**: Apenas usuários autenticados podem criar/editar metas
- **Ownership**: Usuários só podem editar/deletar suas próprias metas
- **Real-time**: Atualizações em tempo real via Supabase Channels (seguro)

## 🛠️ Troubleshooting

### Problema: Progresso não está atualizando

**Solução**:
1. Clique em "Atualizar Progresso" manualmente
2. Verifique se o período da meta está correto
3. Confirme que há dados no período selecionado

### Problema: Erro ao criar meta

**Solução**:
1. Verifique se a migration foi aplicada corretamente
2. Confirme que os tipos Enum existem no banco:
   ```sql
   SELECT * FROM pg_type WHERE typname LIKE 'goal%';
   ```

### Problema: Filtros de Meta Ads não aparecem

**Solução**:
1. Verifique se há contas Meta Ads conectadas
2. Confirme que `useAdAccounts()` retorna dados
3. Verifique as permissões no Supabase

## 📝 Estrutura de Arquivos Criados

```
src/
├── types/
│   └── goals.ts                          # Tipos TypeScript
├── hooks/
│   └── useGoals.ts                       # Hook principal
├── components/
│   └── goals/
│       ├── GoalFormDialog.tsx            # Formulário de criar/editar
│       └── GoalCard.tsx                  # Card de visualização
└── pages/
    └── MetasNew.tsx                      # Página principal

supabase/
└── migrations/
    └── 20251020_unified_goals_system.sql # Migration do banco
```

## 🎨 Personalização

### Alterar Cores de Status

Edite o arquivo `src/types/goals.ts`:

```typescript
export function getGoalStatusColor(status: ComputedGoalStatus): string {
  const colors: Record<ComputedGoalStatus, string> = {
    'Excelente': 'bg-green-500 text-white',  // Altere aqui
    'Em dia': 'bg-blue-500 text-white',
    'Atrasado': 'bg-yellow-500 text-black',
    'Crítico': 'bg-red-500 text-white'
  }
  return colors[status]
}
```

### Adicionar Novo Tipo de Meta

1. Adicione o tipo em `src/types/goals.ts`:
```typescript
export type GoalType =
  | 'existing_types'
  | 'new_custom_type'  // Novo tipo
```

2. Adicione metadata:
```typescript
export const GOAL_TYPE_METADATA: Record<GoalType, GoalTypeMetadata> = {
  // ... existing types
  new_custom_type: {
    label: 'Meu KPI Custom',
    description: 'Descrição do KPI',
    icon: 'Star',
    category: 'custom',
    unit: 'number',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  }
}
```

3. Adicione lógica de cálculo em `src/hooks/useGoals.ts`:
```typescript
case 'new_custom_type': {
  // Sua lógica de cálculo aqui
  currentValue = ...
  break
}
```

## 📚 Recursos Adicionais

- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest
- **shadcn/ui**: https://ui.shadcn.com

## ✅ Checklist de Implementação

- [x] Migration criada
- [x] Tipos TypeScript definidos
- [x] Hook useGoals implementado
- [x] Componente de formulário
- [x] Card de visualização
- [x] Página principal redesenhada
- [x] Cálculo automático de progresso
- [x] Real-time updates
- [x] Documentação

## 🚀 Próximos Passos

1. **Aplicar a migration** no Supabase Dashboard
2. **Testar criação de metas** com diferentes tipos
3. **Verificar cálculo automático** de progresso
4. **Integrar no dashboard principal** (opcional)
5. **Configurar alertas** para metas críticas (futuro)
6. **Exportar relatórios** de progresso (futuro)

---

**Desenvolvido por**: Claude Code
**Versão**: 1.0.0
**Data**: Outubro 2025
