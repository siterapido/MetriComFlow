# Referência Rápida - Supabase Queries

## 🚀 Setup Rápido

```bash
# 1. Instalar dependências (já feito)
npm install @supabase/supabase-js

# 2. Configurar .env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# 3. Executar SQL no Supabase Dashboard
# Copiar: supabase/migrations/001_initial_schema.sql
# Colar no SQL Editor e RUN
```

---

## 📖 Imports

```typescript
import { supabase, authHelpers } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
```

---

## 🔐 Authentication

```typescript
// Sign up
const { data, error } = await authHelpers.signUp(
  'user@example.com',
  'password123',
  { full_name: 'John Doe' }
)

// Sign in
const { data, error } = await authHelpers.signIn(
  'user@example.com',
  'password123'
)

// Sign out
await authHelpers.signOut()

// Get current user
const { data: { user } } = await authHelpers.getUser()

// Get session
const { data: { session } } = await authHelpers.getSession()

// Listen to auth changes
authHelpers.onAuthStateChange((event, session) => {
  console.log('Auth changed:', event, session?.user)
})
```

---

## 🎯 Leads (Kanban)

### SELECT

```typescript
// Get all leads
const { data: leads, error } = await supabase
  .from('leads')
  .select('*')
  .order('position')

// Get leads with labels
const { data } = await supabase
  .from('leads')
  .select(`
    *,
    lead_labels (
      labels (
        id,
        name,
        color
      )
    ),
    checklist_items (*)
  `)
  .order('position')

// Get by status
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'todo')

// Get by assignee
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('assignee_id', userId)

// Search by title
const { data } = await supabase
  .from('leads')
  .select('*')
  .ilike('title', '%proposta%')

// Filter by date range
const { data } = await supabase
  .from('leads')
  .select('*')
  .gte('due_date', '2024-01-01')
  .lte('due_date', '2024-12-31')
```

### INSERT

```typescript
// Create lead
const { data: newLead, error } = await supabase
  .from('leads')
  .insert({
    title: 'Novo Lead',
    description: 'Descrição completa',
    status: 'todo',
    value: 50000,
    due_date: '2024-12-31',
    assignee_name: 'João Silva',
    position: 0
  })
  .select()
  .single()
```

### UPDATE

```typescript
// Update lead status (triggers activity log)
const { data, error } = await supabase
  .from('leads')
  .update({ status: 'doing' })
  .eq('id', leadId)
  .select()
  .single()

// Update multiple fields
const { data } = await supabase
  .from('leads')
  .update({
    title: 'Novo Título',
    description: 'Nova descrição',
    value: 75000,
    assignee_name: 'Maria Santos'
  })
  .eq('id', leadId)

// Move card (update position)
const { data } = await supabase
  .from('leads')
  .update({
    status: 'doing',
    position: newIndex
  })
  .eq('id', leadId)
```

### DELETE

```typescript
// Delete lead (admin only via RLS)
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId)
```

---

## 🏷️ Labels

```typescript
// Get all labels
const { data: labels } = await supabase
  .from('labels')
  .select('*')
  .order('name')

// Create custom label
const { data } = await supabase
  .from('labels')
  .insert({
    name: 'Custom Label',
    color: '#FF5733'
  })
  .select()
  .single()

// Add label to lead
const { data } = await supabase
  .from('lead_labels')
  .insert({
    lead_id: 'lead-uuid',
    label_id: 'label-uuid'
  })

// Remove label from lead
const { error } = await supabase
  .from('lead_labels')
  .delete()
  .match({ lead_id: 'lead-uuid', label_id: 'label-uuid' })

// Get labels for specific lead
const { data } = await supabase
  .from('lead_labels')
  .select('labels(*)')
  .eq('lead_id', leadId)
```

---

## ✅ Checklist Items

```typescript
// Get checklist for lead
const { data: items } = await supabase
  .from('checklist_items')
  .select('*')
  .eq('lead_id', leadId)
  .order('position')

// Create item
const { data } = await supabase
  .from('checklist_items')
  .insert({
    lead_id: leadId,
    title: 'Task to complete',
    completed: false,
    position: 0
  })
  .select()
  .single()

// Toggle completion
const { data } = await supabase
  .from('checklist_items')
  .update({ completed: true })
  .eq('id', itemId)

// Delete item
const { error } = await supabase
  .from('checklist_items')
  .delete()
  .eq('id', itemId)
```

---

## 💬 Comments

```typescript
// Get comments for lead
const { data: comments } = await supabase
  .from('comments')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })

// Add comment
const { data } = await supabase
  .from('comments')
  .insert({
    lead_id: leadId,
    user_id: userId,
    user_name: userName,
    content: 'Comment text here'
  })
  .select()
  .single()

// Update own comment
const { data } = await supabase
  .from('comments')
  .update({ content: 'Updated text' })
  .eq('id', commentId)
  .eq('user_id', userId) // RLS ensures this

// Delete own comment
const { error } = await supabase
  .from('comments')
  .delete()
  .eq('id', commentId)
  .eq('user_id', userId)
```

---

## 📎 Attachments

```typescript
// Upload file to storage
const { data: fileData, error: uploadError } = await supabase.storage
  .from('attachments')
  .upload(`leads/${leadId}/${fileName}`, file)

if (!uploadError) {
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(`leads/${leadId}/${fileName}`)

  // Save attachment record
  const { data } = await supabase
    .from('attachments')
    .insert({
      lead_id: leadId,
      file_name: fileName,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId
    })
    .select()
    .single()
}

// Get attachments for lead
const { data: attachments } = await supabase
  .from('attachments')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })

// Delete attachment
await supabase.storage
  .from('attachments')
  .remove([`leads/${leadId}/${fileName}`])

await supabase
  .from('attachments')
  .delete()
  .eq('id', attachmentId)
```

---

## 📊 Activity History

```typescript
// Get recent activity (last 50)
const { data: activities } = await supabase
  .from('lead_activity')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50)

// Get activity for specific lead
const { data } = await supabase
  .from('lead_activity')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })

// Get activity by type
const { data } = await supabase
  .from('lead_activity')
  .select('*')
  .eq('action_type', 'moved')
  .order('created_at', { ascending: false })
```

---

## 🎯 Client Goals

```typescript
// Get all goals
const { data: goals } = await supabase
  .from('client_goals')
  .select('*')
  .order('percentage', { ascending: false })

// Create goal
const { data } = await supabase
  .from('client_goals')
  .insert({
    company_name: 'Empresa Alpha',
    goal_amount: 150000,
    achieved_amount: 0,
    period_start: '2024-01-01',
    period_end: '2024-12-31'
  })
  .select()
  .single()

// Update achieved (percentage auto-calculated)
const { data } = await supabase
  .from('client_goals')
  .update({ achieved_amount: 125000 })
  .eq('id', goalId)
  .select()
  .single()

// Get goals by status
const { data } = await supabase
  .from('client_goals')
  .select('*')
  .eq('status', 'Excelente')

// Get goals for date range
const { data } = await supabase
  .from('client_goals')
  .select('*')
  .gte('period_end', '2024-01-01')
  .lte('period_end', '2024-12-31')
```

---

## 💰 Revenue Records

```typescript
// Get all revenue
const { data: revenue } = await supabase
  .from('revenue_records')
  .select('*')
  .order('date', { ascending: false })

// Get by category
const { data } = await supabase
  .from('revenue_records')
  .select('*')
  .eq('category', 'new_up')
  .eq('year', 2024)

// Get by month
const { data } = await supabase
  .from('revenue_records')
  .select('*')
  .eq('month', 'Jan')
  .eq('year', 2024)

// Create revenue record
const { data } = await supabase
  .from('revenue_records')
  .insert({
    category: 'new_up',
    amount: 195000,
    month: 'Jun',
    year: 2024,
    date: '2024-06-30',
    description: 'Faturamento mensal'
  })
  .select()
  .single()
```

---

## 📈 Dashboard Views

### KPIs

```typescript
// Get dashboard KPIs (from view)
const { data: kpis, error } = await supabase
  .from('dashboard_kpis')
  .select('*')
  .single()

// Returns:
// {
//   faturamento_mensal: 195000,
//   faturamento_anual: 2100000,
//   oportunidades_ativas: 47,
//   pipeline_value: 850000
// }
```

### Monthly Revenue

```typescript
// Get monthly revenue (from view)
const { data: revenue } = await supabase
  .from('monthly_revenue')
  .select('*')
  .eq('year', 2024)
  .order('month')

// Returns array of:
// {
//   month: 'Jan',
//   year: 2024,
//   category: 'new_up',
//   total_amount: 120000,
//   record_count: 5
// }
```

---

## 🔄 Real-time Subscriptions

```typescript
// Subscribe to lead changes
const channel = supabase
  .channel('leads-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // or 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: 'leads'
    },
    (payload) => {
      console.log('Change:', payload)
      // payload.eventType: 'INSERT', 'UPDATE', 'DELETE'
      // payload.new: new row data
      // payload.old: old row data
    }
  )
  .subscribe()

// Unsubscribe
channel.unsubscribe()

// Multiple tables
const multiChannel = supabase
  .channel('multi-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, handleLeads)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handleComments)
  .subscribe()

// Filter by specific row
const specificChannel = supabase
  .channel('specific-lead')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'leads',
      filter: `id=eq.${leadId}`
    },
    (payload) => {
      console.log('This lead changed:', payload)
    }
  )
  .subscribe()
```

---

## 🎣 React Query Integration

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch leads
const { data: leads, isLoading, error } = useQuery({
  queryKey: ['leads'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('position')
    if (error) throw error
    return data
  },
  staleTime: 30000 // 30 seconds
})

// Create lead mutation
const queryClient = useQueryClient()

const createLead = useMutation({
  mutationFn: async (leadData) => {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single()
    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }
})

// Usage
createLead.mutate({
  title: 'New Lead',
  status: 'todo',
  value: 50000
})

// Update lead mutation
const updateLead = useMutation({
  mutationFn: async ({ id, updates }) => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  onMutate: async ({ id, updates }) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['leads'] })
    const previous = queryClient.getQueryData(['leads'])

    queryClient.setQueryData(['leads'], (old) =>
      old.map(lead => lead.id === id ? { ...lead, ...updates } : lead)
    )

    return { previous }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['leads'], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }
})
```

---

## 🔍 Advanced Queries

```typescript
// Pagination
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .range(0, 9) // First 10 items

// Count total
const { count } = await supabase
  .from('leads')
  .select('*', { count: 'exact', head: true })

// Multiple filters
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'todo')
  .gte('value', 50000)
  .not('assignee_id', 'is', null)

// OR conditions
const { data } = await supabase
  .from('leads')
  .select('*')
  .or('status.eq.doing,status.eq.done')

// IN clause
const { data } = await supabase
  .from('leads')
  .select('*')
  .in('status', ['todo', 'doing'])

// Full text search
const { data } = await supabase
  .from('leads')
  .select('*')
  .textSearch('title', 'proposta')

// Aggregate functions
const { data } = await supabase
  .rpc('get_total_pipeline_value')
```

---

## 🛠️ Utility Functions

```typescript
// Get user profile
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

// Get team members
async function getTeamMembers() {
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('active', true)
    .order('name')
  return data
}

// Get lead with all relations
async function getLeadFull(leadId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      lead_labels (
        labels (*)
      ),
      checklist_items (*),
      comments (*),
      attachments (*)
    `)
    .eq('id', leadId)
    .single()
  return data
}
```

---

## 📚 Recursos

- **[DATABASE.md](./DATABASE.md)** - Documentação completa
- **[SETUP_SUPABASE.md](./SETUP_SUPABASE.md)** - Guia de setup
- **[SUPABASE_OVERVIEW.md](./SUPABASE_OVERVIEW.md)** - Visão geral

---

**Última atualização**: 2025-10-14
