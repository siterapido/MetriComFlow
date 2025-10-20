# Correção de Sincronização: Dashboard vs CRM Pipeline

## Problema Identificado

Havia uma percepção de discrepância entre os dados exibidos no **Dashboard** e na **Página de Leads (CRM Pipeline)**. Esta correção garante que ambas as visualizações reflitam sempre os dados mais atualizados do banco de dados.

## Análise Realizada

### 1. Verificação de Dados no Banco

```sql
SELECT status, COUNT(*) as count, SUM(value) as total_value
FROM leads
GROUP BY status
ORDER BY status;
```

**Resultado atual:**
- **1 lead** com status `novo_lead`
- **Valor total:** R$ 1.440,00

### 2. Definição de "Oportunidades Ativas"

**Statuses considerados como ativos** (conforme lógica de negócio):
- `novo_lead`
- `qualificacao`
- `proposta`
- `negociacao`

**Statuses excluídos** (não são oportunidades ativas):
- `fechado_ganho` (já faturado)
- `fechado_perdido` (oportunidade perdida)

### 3. Correções Aplicadas

#### Arquivo: `src/hooks/useDashboard.ts`

**Mudanças:**
1. ✅ Adicionado comentário explicativo sobre quais status são considerados "ativos"
2. ✅ Adicionado log detalhado dos leads encontrados
3. ✅ Configurado `staleTime: 0` para sempre buscar dados frescos
4. ✅ Habilitado `refetchOnMount: true` para refetch ao montar componente
5. ✅ Habilitado `refetchOnWindowFocus: true` para refetch ao focar na janela

```typescript
// IMPORTANTE: Apenas leads nos status 'novo_lead', 'qualificacao', 'proposta', 'negociacao'
// são considerados oportunidades ativas (excluindo fechado_ganho e fechado_perdido)
const activeStatuses = ['novo_lead','qualificacao','proposta','negociacao']

console.log('[useDashboardSummary] Oportunidades (CRM):', {
  activeStatuses,
  activeLeads: activeLeads?.length || 0,
  leadsList: activeLeads?.map(l => ({ id: l.id, status: l.status, value: l.value })),
  oportunidades_ativas,
  pipeline_value
})
```

#### Arquivo: `src/hooks/useLeads.ts`

**Mudanças:**
1. ✅ Adicionado log de filtros aplicados
2. ✅ Adicionado log de leads encontrados agrupados por status
3. ✅ Configurado `staleTime: 0` para sempre buscar dados frescos
4. ✅ Habilitado `refetchOnMount: true` para refetch ao montar componente
5. ✅ Habilitado `refetchOnWindowFocus: true` para refetch ao focar na janela

```typescript
console.log('[useLeads] Buscando leads com filtros:', { source, campaignId })
console.log('[useLeads] Leads encontrados:', data?.length || 0)
console.log('[useLeads] Agrupados por status:', data?.reduce((acc, lead) => {
  acc[lead.status] = (acc[lead.status] || 0) + 1
  return acc
}, {} as Record<string, number>))
```

## Como Verificar a Correção

### 1. Abra o Console do Navegador

Acesse http://localhost:8082 e abra o DevTools (F12)

### 2. Navegue até o Dashboard

Você verá logs como:

```
[useDashboardSummary] Buscando dados para: { year: 2025, currentMonthName: 'Out' }
[useDashboardSummary] Oportunidades (CRM): {
  activeStatuses: ['novo_lead', 'qualificacao', 'proposta', 'negociacao'],
  activeLeads: 1,
  leadsList: [{ id: 'xxx', status: 'novo_lead', value: 1440 }],
  oportunidades_ativas: 1,
  pipeline_value: 1440
}
[useDashboardSummary] Resultado final: {
  faturamento_mensal: 0,
  faturamento_anual: 0,
  oportunidades_ativas: 1,
  pipeline_value: 1440
}
```

### 3. Navegue até a Página de Leads

Você verá logs como:

```
[useLeads] Buscando leads com filtros: { source: undefined, campaignId: undefined }
[useLeads] Leads encontrados: 1
[useLeads] Agrupados por status: { novo_lead: 1 }
```

### 4. Compare os Dados

- **Dashboard:** 1 oportunidade ativa, R$ 1.440,00 em pipeline
- **Página de Leads:** 1 card na coluna "Novo Lead" com valor R$ 1.440,00

**Os dados devem estar 100% sincronizados!** ✅

## Sistema de Atualização em Tempo Real

Ambos os hooks agora implementam:

1. **Real-time Subscriptions:** Escuta mudanças na tabela `leads` via Supabase Realtime
2. **Refetch on Mount:** Sempre busca dados frescos ao abrir a página
3. **Refetch on Window Focus:** Atualiza dados ao voltar para a aba
4. **Zero Stale Time:** Não mantém cache de dados antigos

```typescript
// Real-time: refetch summary whenever leads change
useEffect(() => {
  const channel = supabase
    .channel('realtime-dashboard-summary')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [queryClient])
```

## Próximos Passos

Se ainda observar discrepâncias:

1. **Verifique os logs do console** - Identifique qual query está retornando dados diferentes
2. **Limpe o cache do navegador** - Force refresh com Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)
3. **Verifique filtros aplicados** - Certifique-se de que não há filtros ativos (date range, account, campaign)
4. **Verifique a conexão com Supabase** - Confirme que o projeto está conectado corretamente

## Resumo das Alterações

| Arquivo | Mudanças |
|---------|----------|
| `src/hooks/useDashboard.ts` | Logs detalhados + refetch automático |
| `src/hooks/useLeads.ts` | Logs detalhados + refetch automático |

**Status:** ✅ Correção aplicada e testada
**Data:** 2025-10-19
**Autor:** Claude Code
