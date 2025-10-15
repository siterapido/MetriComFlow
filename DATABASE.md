# Metricom Flow - Database Documentation

## Overview

This document describes the complete database schema for the Metricom Flow CRM application, built on **Supabase** (PostgreSQL).

## Table of Contents

1. [Architecture](#architecture)
2. [Tables](#tables)
3. [Views](#views)
4. [Functions & Triggers](#functions--triggers)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Setup Instructions](#setup-instructions)
7. [API Usage Examples](#api-usage-examples)

---

## Architecture

The database is designed to support:
- **Lead Management** (Kanban board with drag-and-drop)
- **Revenue Tracking** (Dashboard KPIs)
- **Client Goals** (Metas tracking)
- **Activity History** (Audit trail)
- **Team Collaboration** (Comments, attachments, assignments)

### Key Features

- **UUID Primary Keys** - All tables use UUIDs for primary keys
- **Row Level Security (RLS)** - Secure data access at the database level
- **Automatic Timestamps** - `created_at` and `updated_at` fields with triggers
- **Computed Columns** - Automatic calculation of percentages and status
- **Real-time Subscriptions** - Built-in support via Supabase
- **Type Safety** - Full TypeScript types generated from schema

---

## Tables

### 1. `profiles`

Extends Supabase Auth users with application-specific data.

**Columns:**
- `id` (UUID, PK) - References `auth.users(id)`
- `full_name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `avatar_url` (TEXT, NULLABLE)
- `role` (TEXT) - 'admin', 'manager', or 'user'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**RLS Policies:**
- Anyone can view all profiles
- Users can only update their own profile

---

### 2. `team_members`

Stores team members who can be assigned to leads.

**Columns:**
- `id` (UUID, PK)
- `profile_id` (UUID, FK → profiles.id)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL)
- `position` (TEXT)
- `department` (TEXT)
- `active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**RLS Policies:**
- Anyone can view team members
- Only admins/managers can create/update/delete

---

### 3. `leads`

Core table for Kanban board cards.

**Columns:**
- `id` (UUID, PK)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `status` (TEXT, NOT NULL) - 'todo', 'doing', or 'done'
- `value` (DECIMAL) - Contract value
- `due_date` (DATE)
- `assignee_id` (UUID, FK → team_members.id)
- `assignee_name` (TEXT) - Denormalized for performance
- `comments_count` (INTEGER) - Auto-updated via trigger
- `attachments_count` (INTEGER) - Auto-updated via trigger
- `position` (INTEGER) - For ordering within columns
- `created_by` (UUID, FK → profiles.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_leads_status` on `status`
- `idx_leads_assignee` on `assignee_id`
- `idx_leads_due_date` on `due_date`

**RLS Policies:**
- Anyone can view leads
- Authenticated users can create/update
- Only admins can delete

---

### 4. `labels`

Predefined and custom labels for leads.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL, UNIQUE)
- `color` (TEXT, DEFAULT '#2DA7FF')
- `created_at` (TIMESTAMP)

**Initial Data:**
- Urgente, Comercial, Reunião, Desenvolvimento
- Alta Prioridade, Baixa Prioridade, Proposta
- Negociação, Contrato, Concluído, Faturado

---

### 5. `lead_labels`

Junction table for many-to-many relationship between leads and labels.

**Columns:**
- `lead_id` (UUID, FK → leads.id)
- `label_id` (UUID, FK → labels.id)
- `created_at` (TIMESTAMP)

**Primary Key:** Composite (`lead_id`, `label_id`)

---

### 6. `checklist_items`

Checklist items within a lead card.

**Columns:**
- `id` (UUID, PK)
- `lead_id` (UUID, FK → leads.id)
- `title` (TEXT, NOT NULL)
- `completed` (BOOLEAN, DEFAULT false)
- `position` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

### 7. `comments`

Comments on lead cards.

**Columns:**
- `id` (UUID, PK)
- `lead_id` (UUID, FK → leads.id)
- `user_id` (UUID, FK → profiles.id)
- `user_name` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Triggers:**
- Automatically increments/decrements `leads.comments_count`

**RLS Policies:**
- Anyone can view comments
- Users can only edit/delete their own comments

---

### 8. `attachments`

File attachments on leads.

**Columns:**
- `id` (UUID, PK)
- `lead_id` (UUID, FK → leads.id)
- `file_name` (TEXT, NOT NULL)
- `file_url` (TEXT, NOT NULL)
- `file_type` (TEXT)
- `file_size` (BIGINT)
- `uploaded_by` (UUID, FK → profiles.id)
- `created_at` (TIMESTAMP)

**Triggers:**
- Automatically increments/decrements `leads.attachments_count`

---

### 9. `lead_activity`

Activity history and audit trail for leads.

**Columns:**
- `id` (UUID, PK)
- `lead_id` (UUID, FK → leads.id)
- `lead_title` (TEXT, NOT NULL)
- `user_id` (UUID, FK → profiles.id)
- `user_name` (TEXT)
- `action_type` (TEXT) - 'created', 'moved', 'updated', 'deleted', 'commented'
- `from_status` (TEXT)
- `to_status` (TEXT)
- `description` (TEXT)
- `created_at` (TIMESTAMP)

**Indexes:**
- `idx_lead_activity_lead` on `lead_id`
- `idx_lead_activity_created` on `created_at DESC`

**Triggers:**
- Automatically logs when a lead changes status

---

### 10. `client_goals`

Client goal tracking (Metas).

**Columns:**
- `id` (UUID, PK)
- `company_name` (TEXT, NOT NULL)
- `goal_amount` (DECIMAL, NOT NULL)
- `achieved_amount` (DECIMAL, DEFAULT 0)
- `percentage` (DECIMAL, COMPUTED) - Auto-calculated
- `status` (TEXT, COMPUTED) - 'Excelente', 'Em dia', 'Atrasado', 'Crítico'
- `period_start` (DATE, NOT NULL)
- `period_end` (DATE, NOT NULL)
- `created_by` (UUID, FK → profiles.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Computed Columns:**
- `percentage`: `(achieved_amount / goal_amount * 100)`
- `status`: Based on percentage ranges

**Indexes:**
- `idx_client_goals_company` on `company_name`
- `idx_client_goals_period` on `period_start`, `period_end`

---

### 11. `revenue_records`

Monthly revenue tracking for dashboard charts.

**Columns:**
- `id` (UUID, PK)
- `category` (TEXT) - 'new_up', 'clientes', or 'oportunidades'
- `amount` (DECIMAL, NOT NULL)
- `month` (TEXT, NOT NULL) - 'Jan', 'Fev', etc.
- `year` (INTEGER, NOT NULL)
- `date` (DATE, NOT NULL)
- `description` (TEXT)
- `related_lead_id` (UUID, FK → leads.id)
- `related_goal_id` (UUID, FK → client_goals.id)
- `created_by` (UUID, FK → profiles.id)
- `created_at` (TIMESTAMP)

**Indexes:**
- `idx_revenue_date` on `date DESC`
- `idx_revenue_category` on `category`
- `idx_revenue_year_month` on `year`, `month`

---

### 12. `stopped_sales`

Tracks leads with no recent activity.

**Columns:**
- `id` (UUID, PK)
- `lead_id` (UUID, FK → leads.id)
- `cliente` (TEXT, NOT NULL)
- `valor` (DECIMAL, NOT NULL)
- `dias_parado` (INTEGER, DEFAULT 0)
- `last_activity_date` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

## Views

### 1. `dashboard_kpis`

Aggregated KPIs for the dashboard.

**Columns:**
- `faturamento_mensal` (DECIMAL) - Current month revenue
- `faturamento_anual` (DECIMAL) - Current year revenue
- `oportunidades_ativas` (INTEGER) - Active leads count
- `pipeline_value` (DECIMAL) - Total value of active leads

**Usage:**
```typescript
const { data } = await supabase.from('dashboard_kpis').select('*').single()
```

---

### 2. `monthly_revenue`

Monthly revenue breakdown by category.

**Columns:**
- `month` (TEXT)
- `year` (INTEGER)
- `category` (TEXT)
- `total_amount` (DECIMAL)
- `record_count` (INTEGER)

**Usage:**
```typescript
const { data } = await supabase
  .from('monthly_revenue')
  .select('*')
  .eq('year', 2024)
  .order('month')
```

---

## Functions & Triggers

### 1. `update_updated_at_column()`

Automatically updates the `updated_at` timestamp on row updates.

**Applied to:**
- profiles, team_members, leads, checklist_items, comments, client_goals

---

### 2. `log_lead_movement()`

Logs lead status changes to `lead_activity` table.

**Trigger:** `AFTER UPDATE ON leads`

---

### 3. `update_lead_comments_count()`

Increments/decrements `leads.comments_count` on comment insert/delete.

**Trigger:** `AFTER INSERT OR DELETE ON comments`

---

### 4. `update_lead_attachments_count()`

Increments/decrements `leads.attachments_count` on attachment insert/delete.

**Trigger:** `AFTER INSERT OR DELETE ON attachments`

---

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

### Read Access
- Most tables allow public read access (SELECT)
- This supports the collaborative nature of the CRM

### Write Access
- Authenticated users can create/update most records
- Users can only edit their own comments/attachments
- Only admins can delete leads

### Security Best Practices
```typescript
// RLS is enforced automatically when using Supabase client
const { data } = await supabase.from('leads').select('*')
// User sees only what RLS policies allow
```

---

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

### 2. Apply Schema

#### Option A: Using Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### 3. Configure Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Generate TypeScript Types

```bash
# Generate types from remote database
supabase gen types typescript --project-id your-project-ref > src/lib/database.types.ts

# Or from local database (if using local dev)
supabase gen types typescript --local > src/lib/database.types.ts
```

---

## API Usage Examples

### Authentication

```typescript
import { supabase, authHelpers } from '@/lib/supabase'

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
```

---

### Leads (Kanban)

```typescript
import { supabase } from '@/lib/supabase'

// Fetch all leads with labels
const { data: leads } = await supabase
  .from('leads')
  .select(`
    *,
    lead_labels (
      labels (*)
    ),
    checklist_items (*)
  `)
  .order('position')

// Create new lead
const { data: newLead } = await supabase
  .from('leads')
  .insert({
    title: 'New Lead',
    description: 'Description',
    status: 'todo',
    value: 50000,
    due_date: '2024-12-31',
    assignee_name: 'João Silva'
  })
  .select()
  .single()

// Update lead status (triggers activity log)
const { data } = await supabase
  .from('leads')
  .update({ status: 'doing' })
  .eq('id', leadId)

// Delete lead (admin only)
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId)
```

---

### Labels

```typescript
// Get all labels
const { data: labels } = await supabase
  .from('labels')
  .select('*')

// Add label to lead
const { data } = await supabase
  .from('lead_labels')
  .insert({
    lead_id: 'uuid-here',
    label_id: 'label-uuid-here'
  })

// Remove label from lead
const { error } = await supabase
  .from('lead_labels')
  .delete()
  .match({ lead_id: 'uuid', label_id: 'uuid' })
```

---

### Comments

```typescript
// Add comment
const { data } = await supabase
  .from('comments')
  .insert({
    lead_id: leadId,
    user_id: userId,
    user_name: userName,
    content: 'Comment text'
  })
  .select()
  .single()

// Get comments for lead
const { data: comments } = await supabase
  .from('comments')
  .select('*')
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })

// Update own comment
const { data } = await supabase
  .from('comments')
  .update({ content: 'Updated text' })
  .eq('id', commentId)
```

---

### Checklist Items

```typescript
// Create checklist item
const { data } = await supabase
  .from('checklist_items')
  .insert({
    lead_id: leadId,
    title: 'Task to complete',
    completed: false,
    position: 0
  })

// Toggle completion
const { data } = await supabase
  .from('checklist_items')
  .update({ completed: true })
  .eq('id', itemId)

// Get checklist for lead
const { data: items } = await supabase
  .from('checklist_items')
  .select('*')
  .eq('lead_id', leadId)
  .order('position')
```

---

### Activity History

```typescript
// Get recent activity
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
```

---

### Client Goals

```typescript
// Create goal
const { data: goal } = await supabase
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

// Update achieved amount (percentage auto-calculated)
const { data } = await supabase
  .from('client_goals')
  .update({ achieved_amount: 125000 })
  .eq('id', goalId)

// Get all goals with computed fields
const { data: goals } = await supabase
  .from('client_goals')
  .select('*')
  .order('percentage', { ascending: false })
```

---

### Dashboard KPIs

```typescript
// Get current KPIs (from view)
const { data: kpis } = await supabase
  .from('dashboard_kpis')
  .select('*')
  .single()

// Get monthly revenue data
const { data: revenue } = await supabase
  .from('monthly_revenue')
  .select('*')
  .eq('year', 2024)
```

---

### Real-time Subscriptions

```typescript
// Subscribe to lead changes
const channel = supabase
  .channel('leads-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'leads'
    },
    (payload) => {
      console.log('Lead changed:', payload)
      // Update UI accordingly
    }
  )
  .subscribe()

// Subscribe to new comments
const commentsChannel = supabase
  .channel('comments-insert')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'comments'
    },
    (payload) => {
      console.log('New comment:', payload.new)
    }
  )
  .subscribe()

// Unsubscribe when done
channel.unsubscribe()
```

---

### Storage (for Attachments)

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('attachments')
  .upload(`leads/${leadId}/${fileName}`, file)

if (!error) {
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(`leads/${leadId}/${fileName}`)

  // Save attachment record
  await supabase.from('attachments').insert({
    lead_id: leadId,
    file_name: fileName,
    file_url: urlData.publicUrl,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: userId
  })
}

// Delete file
await supabase.storage
  .from('attachments')
  .remove([`leads/${leadId}/${fileName}`])
```

---

## Migration Notes

When migrating from mock data to real database:

1. **Leads Page**: Replace `initialBoards` with Supabase queries
2. **Dashboard**: Replace `monthlyData` with `revenue_records` queries
3. **Metas**: Replace `clientGoals` with `client_goals` queries
4. **Comments/Attachments**: Integrate with respective tables
5. **Activity History**: Already tracked automatically via triggers

---

## Performance Optimization

### Indexes
All critical query paths are indexed:
- Lead status and assignee
- Activity timestamps
- Revenue dates and categories

### Denormalization
- `assignee_name` in leads (avoid JOIN on every query)
- `user_name` in comments (avoid JOIN on list views)
- Computed columns in goals (percentage, status)

### Caching Strategy
```typescript
// Use TanStack Query for caching
const { data: leads } = useQuery({
  queryKey: ['leads'],
  queryFn: async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
    return data
  },
  staleTime: 30000 // 30 seconds
})
```

---

## Security Considerations

1. **RLS Policies**: Always enabled, tested for edge cases
2. **API Keys**: Use environment variables, never commit
3. **Input Validation**: Zod schemas on client + CHECK constraints on DB
4. **File Uploads**: Validate file types and sizes
5. **Auth**: Use Supabase Auth, don't roll your own

---

## Troubleshooting

### Common Issues

**Issue**: "relation does not exist"
- **Solution**: Run the migration SQL in Supabase dashboard

**Issue**: "permission denied for table"
- **Solution**: Check RLS policies, ensure user is authenticated

**Issue**: Types not matching
- **Solution**: Regenerate types: `supabase gen types typescript`

**Issue**: Real-time not working
- **Solution**: Enable Realtime for tables in Supabase dashboard

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)

---

**Last Updated**: 2025-10-14
**Schema Version**: 1.0.0
