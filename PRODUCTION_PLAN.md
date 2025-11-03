# 🚀 InsightFy - Plano de Produção SaaS

**Status do Projeto:** ⚠️ **NÃO PRONTO PARA PRODUÇÃO** (Correções Críticas em Andamento)

**Data de Análise:** 03 de Novembro de 2025
**Última Atualização:** 03 de Novembro de 2025

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Bugs Críticos Encontrados](#bugs-críticos-encontrados)
3. [Status das Correções](#status-das-correções)
4. [Fases de Implementação](#fases-de-implementação)
5. [Checklist de Deployment](#checklist-de-deployment)
6. [Próximos Passos](#próximos-passos)
7. [Referências](#referências)

---

## 📊 Resumo Executivo

### Descobertas Principais

Durante a auditoria de segurança pré-produção, foram identificados **3 bugs CRÍTICOS** e **4 bugs de ALTA severidade** que impedem o deploy seguro em produção:

| Categoria | Quantidade | Impacto |
|-----------|------------|---------|
| **CRÍTICO** | 3 | Vazamento de dados entre organizações |
| **ALTO** | 4 | Violação de multi-tenancy |
| **MÉDIO** | 10 | Performance e configuração |
| **BAIXO** | 5 | Qualidade de código |

### Risco Principal

**VAZAMENTO DE DADOS MULTI-TENANT:** Todos os usuários autenticados podem ver dados de TODAS as organizações devido à ausência de filtros `organization_id` no banco de dados e nos hooks do frontend.

### Tempo Estimado para Produção

- **Tempo mínimo:** 3-4 semanas
- **Tempo recomendado:** 5-6 semanas (incluindo testes completos)

---

## 🔴 Bugs Críticos Encontrados

### **1. CRÍTICO: Tabela `leads` SEM `organization_id`**

**Arquivo:** Schema do banco de dados
**Impacto:** Todos os usuários veem todos os leads de todas as organizações
**Risco:** Vazamento completo de dados de clientes

**Detalhes:**
```sql
-- PROBLEMA: Tabela criada sem organization_id
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  -- ... outros campos
  -- ❌ FALTA: organization_id UUID REFERENCES organizations(id)
);
```

**Status:** ✅ **CORRIGIDO** (Migration criada)

---

### **2. CRÍTICO: Tabela `client_goals` SEM `organization_id`**

**Arquivo:** `supabase/migrations/202510200002_unified_goals_system.sql:47-102`
**Impacto:** Metas visíveis entre organizações
**Risco:** Dados estratégicos expostos

**Status:** ✅ **CORRIGIDO** (Migration criada)

---

### **3. CRÍTICO: RLS Policy Permissivo Demais**

**Arquivo:** `supabase/migrations/001_initial_schema.sql:89`
**Código problemático:**
```sql
CREATE POLICY "Anyone can view leads"
  ON public.leads FOR SELECT
  USING (true);  -- ❌ PERMITE ACESSO SEM AUTENTICAÇÃO!
```

**Impacto:** Até usuários não autenticados podem ver todos os leads
**Status:** ✅ **CORRIGIDO** (RLS policies atualizadas)

---

### **4. HIGH: Hook `useLeads` SEM Filtro de Organização**

**Arquivo:** `src/hooks/useLeads.ts:49-223`
**Problema:** Todas as queries buscam leads sem filtrar por `organization_id`

**Código problemático:**
```typescript
// ❌ ANTES
let query = supabase
  .from('leads')
  .select('*')
  .order('position')
// Falta: .eq('organization_id', org.id)
```

**Funções afetadas:** 11 hooks (useLeads, useCreateLead, useUpdateLead, useDeleteLead, useLeadActivity, useLeadsByStatus, usePipelineStats, useLeadsFollowUp, useProductInterests, useLeadSourceDetails)

**Status:** ✅ **CORRIGIDO** (Todos os hooks atualizados)

---

### **5. HIGH: Hooks do Dashboard SEM Filtro de Organização**

**Arquivo:** `src/hooks/useDashboard.ts`
**Funções afetadas:**
- `useDashboardSummary()` (lines 43-155)
- `useMetaKPIs()` (lines 165-320)
- `usePipelineMetrics()` (lines 342-461)
- `usePipelineEvolution()` (lines 474-571)
- `useCombinedFunnelData()` (lines 594-742)

**Impacto:** Dashboard mostra dados de todas as organizações; métricas calculadas incorretamente

**Status:** ⚠️ **PENDENTE** (Próxima tarefa)

---

### **6. HIGH: Hook `useGoals` SEM Filtro de Organização**

**Arquivo:** `src/hooks/useGoals.ts`
**Funções afetadas:**
- `useGoals()` (lines 32-56)
- `useGoal()` (lines 84-97)
- `useGoalProgress()` (lines 106-119)
- `useCreateGoal()` (lines 128-144)
- `useCalculateGoalProgress()` (lines 230-622)
- `useBulkCalculateGoals()` (lines 631-652)

**Impacto:** Usuários veem/editam metas de todas as organizações

**Status:** ⚠️ **PENDENTE**

---

### **7. HIGH: Tabela `labels` SEM `organization_id`**

**Arquivo:** `src/hooks/useLabels.ts:8-22`
**Problema adicional:** Constraint UNIQUE no nome impede "Prioridade Alta" em múltiplas organizações

**Status:** ✅ **PARCIALMENTE CORRIGIDO** (Hook corrigido, migration criada)

---

## ✅ Status das Correções

### ✅ Concluído

- [x] **Migration 1:** Adicionar `organization_id` a tabelas core (leads, goals, labels, revenue_records, comments, attachments, checklist_items, tasks, interactions)
- [x] **Migration 2:** Atualizar RLS policies para org-scoped
- [x] **Hook `useLeads`:** Todos os 11 hooks corrigidos com filtro de organização
- [x] **Hook `useLabels`:** Corrigido com filtro de organização
- [x] **Real-time subscriptions:** Atualizados com filtros de organização

### ⚠️ Em Progresso

- [ ] **Hook `useDashboard`:** Atualizar 5 funções principais
- [ ] **Hook `useGoals`:** Atualizar 6 funções

### ⏳ Pendente

- [ ] Atualizar CORS headers em Edge Functions
- [ ] Adicionar Error Boundaries
- [ ] Habilitar TypeScript strict mode
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Configurar backups no Supabase
- [ ] Configurar domínio e SSL
- [ ] Configurar Sentry para error tracking
- [ ] Testes de isolamento de organização
- [ ] Security audit e penetration testing

---

## 🏗️ Fases de Implementação

### **Fase 1: Correções Críticas de Segurança** ⏱️ (Semana 1-2)

#### Sprint 1.1: Migrations de Banco de Dados ✅ CONCLUÍDO

**Arquivos criados:**
- `supabase/migrations/20251103120000_add_organization_id_to_core_tables.sql`
- `supabase/migrations/20251103120001_update_rls_policies_for_organizations.sql`

**O que foi feito:**
1. ✅ Adicionado `organization_id UUID REFERENCES organizations(id)` a:
   - `leads`
   - `client_goals`
   - `labels`
   - `revenue_records`
   - `lead_activity`
   - `comments`
   - `attachments`
   - `checklist_items`
   - `tasks` (se existir)
   - `interactions` (se existir)
   - `stopped_sales` (se existir)

2. ✅ Backfill de `organization_id` baseado em:
   - `created_by` → buscar organização do usuário em `organization_memberships`
   - Para leads órfãos: atribuir à primeira organização (fallback)

3. ✅ Tornar `organization_id NOT NULL` após backfill

4. ✅ Criar triggers para auto-preencher `organization_id` em inserts futuros

5. ✅ Substituir RLS policies permissivas:
```sql
-- ❌ REMOVIDO
CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);

-- ✅ ADICIONADO
CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );
```

6. ✅ Criar funções auxiliares:
   - `user_is_org_member(org_id UUID)` - Verifica membership
   - `user_organization_ids()` - Retorna IDs das organizações do usuário
   - `get_dashboard_kpis(org_id UUID)` - Dashboard org-scoped
   - `get_monthly_revenue(org_id UUID)` - Revenue org-scoped

#### Sprint 1.2: Correção de Hooks Frontend ✅ PARCIALMENTE CONCLUÍDO

**Hooks Corrigidos:**

✅ **`useLeads.ts`** (11 funções)
- `useLeads()` - Query principal de leads
- `useCreateLead()` - Criação de leads
- `useUpdateLead()` - Atualização de leads
- `useDeleteLead()` - Deleção de leads
- `useLeadActivity()` - Histórico de atividades
- `useLeadsByStatus()` - Leads por status
- `usePipelineStats()` - Estatísticas do pipeline
- `useLeadsFollowUp()` - Follow-ups pendentes
- `useUpdateLeadScore()` - Atualizar score
- `useProductInterests()` - Produtos de interesse
- `useLeadSourceDetails()` - Detalhes de origem

**Padrão aplicado:**
```typescript
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export function useLeads(filters?: LeadFilters) {
  const { data: org } = useActiveOrganization()

  // Real-time com filtro de org
  useEffect(() => {
    if (!org?.id) return
    const channel = supabase
      .channel('realtime-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${org.id}` // ✅ FILTRO
        },
        () => queryClient.invalidateQueries({ queryKey: ['leads', org.id] })
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [org?.id])

  return useQuery({
    queryKey: ['leads', org?.id, filters], // ✅ INCLUIR ORG.ID
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização não encontrada')

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org.id) // ✅ FILTRO CRÍTICO
        .order('position')

      if (error) throw error
      return data
    },
    enabled: !!org?.id, // ✅ SÓ EXECUTAR SE ORG CARREGADA
  })
}
```

✅ **`useLabels.ts`** (1 função)
- `useLabels()` - Query de labels org-scoped

---

### **Fase 2: Correções de Hooks Restantes** ⏱️ (Semana 2-3)

#### Sprint 2.1: Atualizar `useDashboard.ts` ⚠️ PENDENTE

**Funções a corrigir:**
1. `useDashboardSummary()` - KPIs principais
2. `useMetaKPIs()` - Métricas de Meta Ads
3. `usePipelineMetrics()` - Métricas do pipeline
4. `usePipelineEvolution()` - Evolução do pipeline
5. `useCombinedFunnelData()` - Dados combinados do funil

**Mudanças necessárias:**
- Adicionar `useActiveOrganization` hook
- Filtrar todas as queries por `organization_id`
- Atualizar query keys para incluir `org.id`
- Adicionar `enabled: !!org?.id`

#### Sprint 2.2: Atualizar `useGoals.ts` ⚠️ PENDENTE

**Funções a corrigir:**
1. `useGoals()` - Lista de metas
2. `useGoal(id)` - Meta individual
3. `useGoalProgress(id)` - Progresso da meta
4. `useCreateGoal()` - Criar meta
5. `useCalculateGoalProgress()` - Calcular progresso
6. `useBulkCalculateGoals()` - Calcular múltiplas metas

**Atenção:** Cálculos de progresso devem usar apenas leads da organização!

---

### **Fase 3: Melhorias de Qualidade** ⏱️ (Semana 3-4)

#### Sprint 3.1: Error Boundaries ⚠️ PENDENTE

**Criar:** `src/components/ErrorBoundary.tsx`
**Aplicar em:** Dashboard, Leads, MetaAdsConfig, Goals

#### Sprint 3.2: CORS Headers ⚠️ PENDENTE

**Edge Functions a atualizar:**
- `send-team-invitation`
- `accept-invitation`
- `meta-auth`
- `connect-ad-account`
- `sync-daily-insights`
- Todos outros Edge Functions

**Mudança:**
```typescript
// ❌ ANTES
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
}

// ✅ DEPOIS
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'http://localhost:8082',
  'Access-Control-Allow-Credentials': 'true',
}
```

#### Sprint 3.3: TypeScript Strict Mode ⚠️ PENDENTE

**Atualizar:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### **Fase 4: Configuração de Produção** ⏱️ (Semana 4)

#### Sprint 4.1: Variáveis de Ambiente ⚠️ PENDENTE

**Vercel:**
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=https://insightfy.com.br
VITE_META_REDIRECT_URI=https://insightfy.com.br/meta-ads-config
```

**Supabase Secrets:**
```bash
npx supabase secrets set META_APP_ID="your_meta_app_id"
npx supabase secrets set META_APP_SECRET="your_meta_app_secret"
npx supabase secrets set META_ACCESS_TOKEN="your_long_lived_token"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

#### Sprint 4.2: Domínio e SSL ⚠️ PENDENTE

1. Adicionar domínio no Vercel
2. Configurar DNS (A record + CNAME)
3. Verificar SSL automático
4. Atualizar URLs no Supabase

#### Sprint 4.3: Backups no Supabase ⚠️ PENDENTE

1. Enable Daily Backups (retention: 7 days)
2. Testar restore em staging
3. Criar script de backup manual

#### Sprint 4.4: Error Tracking (Sentry) ⚠️ PENDENTE

```bash
npm install @sentry/react
```

---

### **Fase 5: Testes e Auditoria** ⏱️ (Semana 5)

#### Sprint 5.1: Testes de Isolamento de Organização ⚠️ PENDENTE

**Teste Manual:**
1. Criar 2 organizações diferentes
2. Criar leads/metas em cada uma
3. Alternar entre organizações
4. Verificar que dados são isolados
5. Tentar acesso direto via URL com ID de outra org

**Teste Automatizado:**
```typescript
describe('Organization Isolation', () => {
  it('should not allow user from Org A to view leads from Org B', async () => {
    // Implementar teste
  })
})
```

#### Sprint 5.2: Security Audit ⚠️ PENDENTE

**Checklist:**
- [ ] Todas as tabelas têm `organization_id`
- [ ] Todas as RLS policies verificam `organization_id`
- [ ] Nenhum secret exposto no código cliente
- [ ] CORS configurado com domínio específico
- [ ] Tokens OAuth armazenados com segurança
- [ ] Rate limiting configurado
- [ ] Input validation em todos os forms
- [ ] SQL injection prevenido
- [ ] XSS prevenido
- [ ] CSRF tokens onde necessário

**Ferramentas:**
```bash
npm audit --production
npx eslint . --ext .ts,.tsx
```

#### Sprint 5.3: Performance Testing ⚠️ PENDENTE

**Métricas alvo:**
- Tempo de carregamento inicial < 3s
- Time to Interactive < 5s
- Lighthouse Score > 90
- Bundle size < 500KB (gzipped)

---

### **Fase 6: Deploy e Go-Live** ⏱️ (Semana 6)

#### Sprint 6.1: Deploy para Staging ⚠️ PENDENTE

```bash
# 1. Rodar migrations
npx supabase db push

# 2. Deploy Edge Functions
npx supabase functions deploy send-team-invitation
npx supabase functions deploy accept-invitation
npx supabase functions deploy meta-auth
npx supabase functions deploy connect-ad-account
npx supabase functions deploy sync-daily-insights

# 3. Deploy frontend
vercel --env staging
```

**Smoke Testing:**
- [ ] Login/Registro funciona
- [ ] Multi-tenancy funciona (2 orgs isoladas)
- [ ] Dashboard carrega KPIs corretos
- [ ] Leads aparecem e são editáveis
- [ ] Meta Ads OAuth funciona
- [ ] Invites de equipe funcionam

#### Sprint 6.2: Deploy para Produção ⚠️ PENDENTE

**Checklist Pré-Deploy:**
- [ ] Todos os testes passam
- [ ] Security audit completo
- [ ] Backups configurados
- [ ] Monitoring configurado (Sentry)
- [ ] Environment variables configuradas
- [ ] Domínio e SSL configurados
- [ ] Documentação atualizada

**Deploy:**
```bash
git checkout main
git merge staging/pre-production
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin v1.0.0
vercel --prod
```

#### Sprint 6.3: Monitoramento Pós-Deploy ⚠️ PENDENTE

**Primeira semana:**
- Monitorar Sentry para erros
- Verificar Supabase logs diariamente
- Monitorar performance (Vercel Analytics)
- Verificar métricas de uso
- Responder a feedback de usuários

---

## ✅ Checklist de Deployment

### Banco de Dados

- [x] Migration para adicionar `organization_id` criada
- [x] Migration para RLS policies criada
- [ ] Migrations aplicadas em staging
- [ ] Migrations testadas com rollback
- [ ] Migrations aplicadas em produção
- [ ] Verificar que não há registros órfãos
- [ ] Backups configurados (7 dias retention)
- [ ] Índices criados para `organization_id`

### Frontend Hooks

- [x] `useLeads.ts` - 11 funções corrigidas
- [x] `useLabels.ts` - 1 função corrigida
- [ ] `useDashboard.ts` - 5 funções pendentes
- [ ] `useGoals.ts` - 6 funções pendentes
- [x] Real-time subscriptions com filtros de org
- [ ] Todos os hooks testados manualmente
- [ ] Tests automatizados criados

### Edge Functions

- [ ] CORS headers atualizados (10+ funções)
- [ ] Secrets configurados no Supabase
- [ ] Rate limiting implementado
- [ ] Error handling melhorado
- [ ] Logs implementados
- [ ] Todas as funções deployadas

### Segurança

- [x] RLS policies atualizadas para org-scoped
- [ ] Input validation em todos os forms
- [ ] SQL injection prevenido (RLS + Supabase)
- [ ] XSS prevenido (React sanitization)
- [ ] Secrets nunca expostos ao cliente
- [ ] CSRF protection onde necessário
- [ ] Rate limiting em APIs públicas
- [ ] Security headers configurados

### Infraestrutura

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Supabase secrets configurados
- [ ] Domínio customizado configurado
- [ ] SSL certificado instalado
- [ ] CDN configurado (Vercel)
- [ ] Error tracking (Sentry) configurado
- [ ] Monitoring e alertas configurados
- [ ] Backups automáticos configurados

### Qualidade de Código

- [ ] TypeScript strict mode habilitado
- [ ] ESLint sem warnings
- [ ] Todos os `any` types removidos
- [ ] Null checks adicionados
- [ ] Error boundaries implementados
- [ ] Loading states em todas as queries
- [ ] Toast notifications para ações do usuário
- [ ] Código documentado

### Testes

- [ ] Testes de isolamento de organização (manual)
- [ ] Testes de isolamento de organização (automatizado)
- [ ] Smoke tests em staging
- [ ] Performance tests (Lighthouse > 90)
- [ ] Security audit completo
- [ ] Penetration testing (opcional mas recomendado)
- [ ] Load testing (opcional)

### Documentação

- [x] PRODUCTION_PLAN.md criado
- [ ] DEPLOYMENT_GUIDE.md criado
- [ ] RUNBOOK.md criado (procedimentos operacionais)
- [ ] ROLLBACK_PLAN.md criado
- [ ] API documentation atualizada
- [ ] User guides atualizados
- [ ] CHANGELOG.md atualizado

---

## 🚦 Próximos Passos Imediatos

### **URGENTE (Esta Semana)**

1. ✅ ~~Criar migrations para `organization_id`~~
2. ✅ ~~Atualizar RLS policies~~
3. ✅ ~~Corrigir hook `useLeads.ts`~~
4. ✅ ~~Corrigir hook `useLabels.ts`~~
5. **⚠️ Corrigir hook `useDashboard.ts`** (EM ANDAMENTO)
6. **⚠️ Corrigir hook `useGoals.ts`**
7. Rodar migrations em ambiente de desenvolvimento
8. Testar isolamento de organização manualmente

### **Esta Semana + Próxima**

9. Adicionar Error Boundaries
10. Atualizar CORS headers em Edge Functions
11. Habilitar TypeScript strict mode
12. Corrigir erros de type checking
13. Criar testes automatizados de isolamento
14. Deploy para ambiente de staging

### **Semanas 3-4**

15. Configurar variáveis de ambiente no Vercel
16. Configurar Supabase secrets
17. Configurar backups
18. Configurar Sentry
19. Testes de performance
20. Security audit completo

### **Semanas 5-6**

21. Configurar domínio customizado
22. Deploy para produção
23. Monitoramento pós-deploy
24. Criar documentação operacional
25. Treinamento de equipe (se aplicável)

---

## 📚 Referências

### Documentação do Projeto

- [CLAUDE.md](./CLAUDE.md) - Guia completo do projeto
- [DATABASE.md](./DATABASE.md) - Schema e API reference
- [docs/META_ADS_SETUP.md](./docs/META_ADS_SETUP.md) - Setup de Meta Ads
- [docs/VERCEL_ENV_GUIDE.md](./docs/VERCEL_ENV_GUIDE.md) - Configuração Vercel

### Migrations Criadas

- `supabase/migrations/20251103120000_add_organization_id_to_core_tables.sql`
- `supabase/migrations/20251103120001_update_rls_policies_for_organizations.sql`

### Hooks Corrigidos

- `src/hooks/useLeads.ts` - 11 funções org-scoped
- `src/hooks/useLabels.ts` - 1 função org-scoped

### Recursos Externos

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Multi-Tenancy Patterns](https://docs.stripe.com/products/saas)
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)

---

## 🎯 Critérios de Sucesso

### **Minimum Viable Production (MVP)**

Para considerar o projeto pronto para produção, **TODOS** os itens abaixo devem estar completos:

- [x] ✅ Todas as tabelas têm `organization_id`
- [x] ✅ RLS policies validam `organization_id`
- [x] ✅ Hook `useLeads` org-scoped
- [x] ✅ Hook `useLabels` org-scoped
- [ ] ⚠️ Hook `useDashboard` org-scoped
- [ ] ⚠️ Hook `useGoals` org-scoped
- [ ] ⚠️ Testes manuais de isolamento passam
- [ ] ⚠️ Migrations rodadas em produção
- [ ] ⚠️ Error boundaries implementados
- [ ] ⚠️ Monitoring configurado

### **Production Ready (Recomendado)**

Para lançamento com confiança, adicionar:

- [ ] Testes automatizados de isolamento
- [ ] Security audit por terceiros
- [ ] Performance testing (Lighthouse > 90)
- [ ] Load testing
- [ ] Disaster recovery plan testado
- [ ] Runbook completo
- [ ] On-call rotation definida

---

## 📞 Contatos e Suporte

**Desenvolvedor Principal:** Claude (Anthropic)
**Data da Análise:** 03/11/2025
**Versão do Plano:** 1.0

**GitHub Issues:** [github.com/siterapido/MetriComFlow/issues](https://github.com/siterapido/MetriComFlow/issues)

---

**🔒 NOTA DE SEGURANÇA:**

Este projeto **NÃO deve ser deployado em produção** até que TODAS as correções críticas estejam completas e testadas. O vazamento de dados multi-tenant pode resultar em:

- Violação de LGPD/GDPR
- Perda de confiança dos clientes
- Exposição de dados estratégicos
- Possíveis ações legais

**Prioridade:** Segurança > Velocidade > Features

---

**Última atualização:** 03 de Novembro de 2025, 12:00 BRT
