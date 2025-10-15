# Guia de Migração - Supabase Integration

Este guia explica como ativar a integração com Supabase no projeto Metricom Flow.

## 📦 Arquivos Criados

A integração completa com Supabase foi implementada. Os seguintes arquivos foram criados:

### Hooks (já prontos para uso)
- `src/hooks/useLeads.ts` - Hooks para gerenciar leads
- `src/hooks/useLabels.ts` - Hooks para gerenciar labels
- `src/hooks/useClientGoals.ts` - Hooks para gerenciar metas
- `src/hooks/useDashboard.ts` - Hooks para dados do dashboard

### Páginas Migradas (versões `.new.tsx`)
- `src/pages/Leads.new.tsx` - Kanban com Supabase
- `src/pages/Dashboard.new.tsx` - Dashboard com Supabase
- `src/pages/Metas.new.tsx` - Metas com Supabase

### Componentes de Auth
- `src/components/auth/LoginForm.supabase.tsx` - Login com Supabase Auth
- `src/components/auth/RegisterForm.supabase.tsx` - Registro com Supabase Auth
- `src/components/leads/NewLeadModal.supabase.tsx` - Modal atualizado

---

## 🚀 Passo a Passo para Ativar

### 1. Configure o Banco de Dados

Siga o guia **[SETUP_SUPABASE.md](./SETUP_SUPABASE.md)** para:
1. Criar projeto no Supabase
2. Executar o SQL migration
3. Configurar `.env` com as credenciais

### 2. Substitua os Arquivos Antigos

#### Opção A: Backup e Substituição (Recomendado)

```bash
# Backup dos arquivos originais
mv src/pages/Leads.tsx src/pages/Leads.old.tsx
mv src/pages/Dashboard.tsx src/pages/Dashboard.old.tsx
mv src/pages/Metas.tsx src/pages/Metas.old.tsx
mv src/components/leads/NewLeadModal.tsx src/components/leads/NewLeadModal.old.tsx
mv src/components/auth/LoginForm.tsx src/components/auth/LoginForm.old.tsx
mv src/components/auth/RegisterForm.tsx src/components/auth/RegisterForm.old.tsx

# Ative as novas versões
mv src/pages/Leads.new.tsx src/pages/Leads.tsx
mv src/pages/Dashboard.new.tsx src/pages/Dashboard.tsx
mv src/pages/Metas.new.tsx src/pages/Metas.tsx
mv src/components/leads/NewLeadModal.supabase.tsx src/components/leads/NewLeadModal.tsx
mv src/components/auth/LoginForm.supabase.tsx src/components/auth/LoginForm.tsx
mv src/components/auth/RegisterForm.supabase.tsx src/components/auth/RegisterForm.tsx
```

#### Opção B: Edição Manual

Se preferir manter os arquivos originais e fazer a migração gradual, você pode:

1. Copiar o conteúdo de `.new.tsx` para os arquivos originais
2. Ajustar imports conforme necessário
3. Testar cada página individualmente

---

## 📋 Checklist de Migração

### Pré-requisitos
- [ ] Banco de dados Supabase criado
- [ ] SQL migration executado com sucesso
- [ ] Arquivo `.env` configurado
- [ ] `@supabase/supabase-js` instalado

### Hooks (Já Prontos ✅)
- [x] useLeads.ts criado
- [x] useLabels.ts criado
- [x] useClientGoals.ts criado
- [x] useDashboard.ts criado

### Páginas
- [ ] Leads.tsx substituído
- [ ] Dashboard.tsx substituído
- [ ] Metas.tsx substituído

### Componentes
- [ ] NewLeadModal.tsx substituído
- [ ] LoginForm.tsx substituído
- [ ] RegisterForm.tsx substituído

### Testes
- [ ] Login funciona
- [ ] Registro funciona
- [ ] Kanban carrega leads
- [ ] Drag and drop atualiza status
- [ ] Dashboard mostra KPIs
- [ ] Metas exibem corretamente
- [ ] Criar lead funciona

---

## 🔧 Configuração Detalhada

### 1. Environment Variables

Verifique se o arquivo `.env` está configurado:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 2. Populate Initial Data (Opcional)

Para testar a integração com dados de exemplo, execute no SQL Editor do Supabase:

```sql
-- Inserir team members
INSERT INTO public.team_members (name, email, position) VALUES
  ('João Silva', 'joao@example.com', 'Desenvolvedor'),
  ('Maria Santos', 'maria@example.com', 'Gerente de Vendas'),
  ('Pedro Costa', 'pedro@example.com', 'Designer'),
  ('Ana Lima', 'ana@example.com', 'Analista');

-- Inserir leads de exemplo
INSERT INTO public.leads (title, description, status, value, due_date, assignee_name) VALUES
  ('Proposta Empresa ABC', 'Desenvolver proposta comercial completa', 'todo', 50000, '2024-12-15', 'João Silva'),
  ('Projeto XYZ', 'Implementação da primeira fase', 'doing', 75000, '2024-12-20', 'Pedro Costa'),
  ('Contrato DEF', 'Projeto finalizado com sucesso', 'done', 100000, '2024-12-10', 'Ana Lima');

-- Inserir metas de clientes
INSERT INTO public.client_goals (company_name, goal_amount, achieved_amount, period_start, period_end) VALUES
  ('Empresa Alpha', 150000, 125000, '2024-01-01', '2024-12-31'),
  ('Beta Solutions', 200000, 180000, '2024-01-01', '2024-12-31'),
  ('Gamma Corp', 100000, 65000, '2024-01-01', '2024-12-31');

-- Inserir dados de revenue
INSERT INTO public.revenue_records (category, amount, month, year, date) VALUES
  ('new_up', 120000, 'Jan', 2024, '2024-01-31'),
  ('new_up', 135000, 'Fev', 2024, '2024-02-29'),
  ('new_up', 148000, 'Mar', 2024, '2024-03-31'),
  ('new_up', 162000, 'Abr', 2024, '2024-04-30'),
  ('new_up', 178000, 'Mai', 2024, '2024-05-31'),
  ('new_up', 195000, 'Jun', 2024, '2024-06-30'),
  ('clientes', 85000, 'Jan', 2024, '2024-01-31'),
  ('clientes', 92000, 'Fev', 2024, '2024-02-29'),
  ('clientes', 105000, 'Mar', 2024, '2024-03-31'),
  ('oportunidades', 65000, 'Jan', 2024, '2024-01-31'),
  ('oportunidades', 78000, 'Fev', 2024, '2024-02-29'),
  ('oportunidades', 88000, 'Mar', 2024, '2024-03-31');
```

---

## 🎯 Diferenças Principais

### Antes (Mock Data)
```typescript
const [boards, setBoards] = useState(initialBoards);
```

### Depois (Supabase)
```typescript
const { data: leads, isLoading } = useLeads();
const updateLead = useUpdateLead();

// Drag and drop atualiza no banco
await updateLead.mutateAsync({
  id: leadId,
  updates: { status: newStatus }
});
```

---

## 🔍 Como Testar

### 1. Inicie o Projeto
```bash
npm run dev
```

### 2. Acesse a Aplicação
```
http://localhost:8080
```

### 3. Teste o Fluxo Completo

#### Autenticação
1. Vá para a página de registro
2. Crie uma nova conta
3. Confirme o email (se necessário)
4. Faça login

#### Kanban (Leads)
1. Acesse `/leads`
2. Verifique se os leads são carregados
3. Arraste um card para outra coluna
4. Verifique se o histórico é atualizado
5. Crie um novo lead
6. Adicione labels ao lead

#### Dashboard
1. Acesse `/dashboard`
2. Verifique os KPIs
3. Veja os gráficos de faturamento
4. Certifique-se de que os dados são reais

#### Metas
1. Acesse `/metas`
2. Veja as metas dos clientes
3. Verifique a progressão
4. Analise os gráficos de evolução

---

## 🐛 Troubleshooting

### Erro: "supabase is not defined"
→ Verifique se importou corretamente:
```typescript
import { supabase } from '@/lib/supabase'
```

### Erro: "Invalid API key"
→ Verifique o arquivo `.env` e reinicie o servidor:
```bash
npm run dev
```

### Erro: "relation does not exist"
→ Execute o SQL migration no Supabase Dashboard

### Nenhum dado aparece
→ Popule o banco com dados de teste (ver seção acima)

### Loading infinito
→ Abra o Console do navegador (F12) e veja os erros
→ Verifique se as credenciais estão corretas

---

## 📊 Monitoramento

### Ver Queries no Supabase
1. Acesse o Dashboard do Supabase
2. Vá em **Database** > **Query Performance**
3. Veja todas as queries executadas

### Ver Logs em Tempo Real
1. Acesse **Database** > **API Logs**
2. Monitore as requisições em tempo real

---

## ⚡ Otimizações

### Cache com TanStack Query
Todos os hooks já estão configurados com cache:

```typescript
staleTime: 30000 // 30 segundos
```

### Optimistic Updates
O hook `useUpdateLead` usa optimistic updates:
- UI atualiza instantaneamente
- Em caso de erro, reverte automaticamente

### Real-time (Próximo Passo)
Para ativar real-time, adicione em `Leads.tsx`:

```typescript
import { supabase } from '@/lib/supabase'

useEffect(() => {
  const channel = supabase
    .channel('leads-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'leads'
    }, () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [])
```

---

## 📚 Recursos Adicionais

- [DATABASE.md](./DATABASE.md) - Documentação completa do schema
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Cheat sheet de queries
- [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) - Setup inicial
- [Supabase Docs](https://supabase.com/docs)

---

## ✅ Resultado Esperado

Após completar a migração, você terá:

✅ Autenticação funcional com Supabase Auth
✅ Kanban com dados reais do banco
✅ Dashboard com KPIs dinâmicos
✅ Metas calculadas automaticamente
✅ Histórico de atividades automático
✅ Loading states e error handling
✅ Optimistic updates no drag-and-drop
✅ Type safety completo com TypeScript

---

## 🎉 Pronto!

Agora seu CRM está **100% integrado** com Supabase!

Se tiver problemas, consulte:
1. [DATABASE.md](./DATABASE.md) para queries
2. [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) para setup
3. Logs do Console (F12)
4. Supabase Dashboard > API Logs

---

**Última atualização**: 2025-10-14
