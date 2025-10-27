# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Metricom Flow** is a B2B CRM for lead management, revenue tracking, and goal monitoring. Built with **Vite + React 18 + TypeScript**, **shadcn-ui**, **Tailwind CSS**, and **Supabase** backend. Originally created with Lovable (lovable.dev).

## Key Commands

```bash
npm i                # Install dependencies
npm run dev          # Start dev server (port 8082)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Meta Ads Integration
npm run verify:meta  # Verify Meta credentials configuration
npm run sync:envs    # Sync environment variables to production

# Supabase Functions (requires Supabase CLI)
npx supabase functions deploy <function-name>
npx supabase functions logs <function-name>
npx supabase db reset        # Reset local database
npx supabase db push         # Push migrations to remote
```

## Architecture Overview

### Multi-Organization Architecture

**CRITICAL**: The app now supports **multi-tenancy** with organization-based data isolation (added Oct 2023):

- Each user belongs to one or more **organizations**
- All data (leads, goals, metrics) is scoped to an organization
- Users have roles within organizations: `owner`, `admin`, `manager`, `member`
- Organization owners can invite members via email
- **ALL data queries MUST filter by organization_id** to maintain isolation
- **NEW USERS ARE AUTOMATICALLY CREATED AS OWNERS** with their own organization (fixed Oct 2025)

**Key Tables:**
- `organizations` - Tenant/workspace records
- `organization_memberships` - User-to-organization mappings with roles
- `team_invitations` - Pending email invitations

**User Registration Flow (Fixed Oct 2025):**
When a new user signs up via `RegisterForm`:
1. `handle_new_user()` trigger fires on `auth.users` insert
2. Creates profile with `user_type = 'owner'` (not 'sales')
3. Creates personal organization: `{name}'s Organization`
4. Creates organization membership with `role = 'owner'`
5. User is immediately ready to use the system as an organization owner

**Active Organization Pattern:**
```typescript
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

function MyComponent() {
  const { data: org } = useActiveOrganization()
  // org contains: { id, name, slug, role, isOwner }

  // ALWAYS filter queries by org.id
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', org.id) // REQUIRED
}
```

### Routing & Layout Pattern

React Router v6 with v7 future flags enabled. Nested layout with protected routes:

```
App.tsx
├─ QueryClientProvider (TanStack Query)
├─ AuthProvider (global auth state)
└─ BrowserRouter
    ├─ Public Routes
    │   ├─ / (Auth - login/register)
    │   ├─ /setup-admin (first-time setup)
    │   ├─ /accept-invitation (team invite acceptance)
    │   ├─ /auth/forgot-password
    │   ├─ /auth/update-password
    │   ├─ /auth/callback (OAuth)
    │   └─ /privacy-policy
    └─ ProtectedRoute (auth required)
        └─ AppLayout (sidebar + header + Outlet)
            ├─ /dashboard (KPIs, charts)
            ├─ /leads (Linear view - default)
            ├─ /leads/kanban (Kanban board)
            ├─ /formularios (Lead Forms management)
            ├─ /metas (goals tracking)
            ├─ /meta-ads-config (Meta Ads integration)
            ├─ /equipe (UNIFIED team management & invitations - Oct 2025)
            ├─ /team → redirects to /equipe (deprecated)
            ├─ /usuarios → redirects to /equipe (deprecated)
            └─ /meu-perfil (User profile)
```

### State Management Philosophy

**Centralized data fetching with custom hooks:**
- All Supabase queries are wrapped in custom hooks (`src/hooks/`)
- TanStack Query handles caching, refetching, and optimistic updates
- AuthContext provides global auth state (user, session, methods)
- Local `useState` for UI-only state

**Key Hooks:**
- `useAuth` - Authentication (signIn, signUp, signOut, resetPassword, etc.)
- `useActiveOrganization` - Get current active organization for the user
- `useTeam` - Team members management (list, update roles, remove)
- `useInvitations` - Team invitation workflow (send, resend, revoke)
- `useTeamManagement` - **UNIFIED hook** combining team + invitations with filters (Oct 2025)
- `useLeads` - Lead CRUD with optimistic updates (organization-scoped)
- `useDashboard` - KPIs and revenue data (organization-scoped)
- `useClientGoals` - Goals tracking (organization-scoped)
- `useLabels` - Tag management
- `useMetaAuth` - Meta Ads OAuth flow

### Component Organization

```
src/
├── components/
│   ├── ui/          # 50+ shadcn-ui components (button, dialog, form, etc.)
│   ├── layout/      # AppLayout, AppSidebar, Header
│   ├── auth/        # LoginForm, RegisterForm, ProtectedRoute
│   ├── leads/       # NewLeadModal, LeadCard
│   ├── team/        # Team management components (Oct 2025 - UNIFIED)
│   │   ├── InviteMemberDialog.tsx      # Dialog for sending invitations
│   │   ├── UnifiedMemberCard.tsx       # Modern card for active members
│   │   ├── InvitationCard.tsx          # Modern card for pending invitations
│   │   ├── TeamMemberCard.tsx          # (deprecated - use UnifiedMemberCard)
│   │   └── PendingInvitationList.tsx   # (deprecated - use InvitationCard grid)
│   └── meta-ads/    # Meta Ads integration components
├── pages/           # Route components
│   ├── TeamManagement.tsx  # UNIFIED team page (Oct 2025)
│   ├── Team.tsx            # (deprecated - redirects to /equipe)
│   ├── Users.tsx           # (deprecated - redirects to /equipe)
│   └── ...
├── context/         # AuthContext (global auth state)
├── hooks/           # Custom data-fetching hooks (ALWAYS use these, never direct queries)
│   ├── useTeamManagement.ts  # UNIFIED hook for team + invitations (Oct 2025)
│   ├── useTeam.ts            # Team members CRUD
│   ├── useInvitations.ts     # Invitation workflow
│   └── ...
├── lib/
│   ├── utils.ts          # cn() helper
│   ├── supabase.ts       # Supabase client
│   └── database.types.ts # Auto-generated TypeScript types
└── types/           # Shared TypeScript interfaces
```

### Database Architecture (Supabase)

**Complete PostgreSQL schema with:**
- UUID primary keys across all tables
- Row Level Security (RLS) on all tables
- Automatic timestamps (`created_at`, `updated_at`) via triggers
- Materialized views for dashboard KPIs (`dashboard_kpis`, `monthly_revenue`)
- Activity audit trail (`lead_activity` table)

**Key Tables:**

*Multi-tenancy (Organization System):*
- `organizations` - Workspace/tenant records with owner
- `organization_memberships` - User roles within organizations
- `team_invitations` - Pending email invitations with tokens

*Core CRM:*
- `profiles` - User profiles (extends `auth.users`)
- `leads` - Kanban/linear lead cards (organization-scoped)
- `team_members` - Team members for assignment (deprecated, migrating to organization_memberships)
- `labels` / `lead_labels` - Many-to-many tags
- `comments` / `attachments` - Collaboration features
- `checklist_items` - Tasks within leads
- `client_goals` / `goal_metrics` - Goals tracking (organization-scoped)
- `revenue_records` - Monthly revenue data (organization-scoped)

*Meta Ads Integration:*
- `meta_business_connections` - Meta OAuth tokens
- `ad_accounts` / `ad_campaigns` / `ad_daily_insights` - Meta Ads data

**Supabase Edge Functions:**
- `send-team-invitation` - Send invitation email to new team member
- `accept-invitation` - Process invitation acceptance and create membership
- `meta-auth` - OAuth flow for Meta Business accounts
- `sync-daily-insights` - Fetch Meta Ads metrics
- `webhook-lead-ads` - Process Meta Lead Ads webhooks
- `create-admin` - First-time admin setup
- `connect-ad-account` - Link Meta Ad accounts

See [DATABASE.md](DATABASE.md) for complete schema and API reference.

## Development Patterns

### Organization-Scoped Data Access

**CRITICAL PATTERN**: All data queries must respect organization boundaries.

```typescript
// ✅ CORRECT: Organization-scoped query
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

function MyComponent() {
  const { data: org } = useActiveOrganization()

  // Wait for org to load before querying
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org.id) // REQUIRED
      return data
    },
    enabled: !!org?.id // Don't query without org
  })
}

// ❌ WRONG: Missing organization filter
const { data } = await supabase.from('leads').select('*') // SECURITY RISK!
```

**Why this matters:**
- Prevents data leaks between organizations
- RLS policies enforce this at database level
- Queries without org filter will return empty results or error

### Team Management & Invitations

The app supports inviting team members to organizations via email.

**Invitation Flow:**
1. Owner/admin sends invitation via `InviteMemberDialog` → calls `send-team-invitation` Edge Function
2. Edge Function creates `team_invitations` record and sends email with magic link
3. Recipient clicks link → redirected to `/accept-invitation?token=xxx`
4. `AcceptInvitation` page validates token and creates account (if needed)
5. `accept-invitation` Edge Function creates `organization_membership` record
6. User is redirected to dashboard with access to organization

**Key Hooks:**
```typescript
import { useTeam } from '@/hooks/useTeam'
import { useInvitations } from '@/hooks/useInvitations'

// Team management
const {
  members,        // Current team members with roles
  isOwner,        // Current user is owner
  removeMember,   // Remove member from org
  updateMemberRole, // Change member role
  updateMemberUserType // Change user type (admin/user)
} = useTeam()

// Invitation management
const {
  invitations,     // Pending invitations
  sendInvitation,  // Send new invitation (in dialog)
  resendInvitation, // Resend invitation email
  revokeInvitation  // Cancel invitation
} = useInvitations()
```

**Roles:**
- `owner` - Full control, can manage members and billing
- `admin` - Can manage content and members (except owner)
- `manager` - Can manage content (leads, goals)
- `member` - Read and basic write access

### Unified Team Management (Oct 2025)

**IMPORTANT:** As of October 2025, team management has been unified into a single page at `/equipe`.

**What Changed:**
- **OLD:** Separate pages `/team` (team management) and `/usuarios` (user management) with duplicated functionality
- **NEW:** Single unified page at `/equipe` (TeamManagement.tsx) with all features consolidated
- **Redirects:** Both `/team` and `/usuarios` now redirect to `/equipe`
- **Sidebar:** Single "Gestão de Equipe" menu item (no duplication)

**New Hook: `useTeamManagement`**
Combines `useTeam` and `useInvitations` with advanced filtering:
```typescript
import { useTeamManagement } from '@/hooks/useTeamManagement'

function TeamPage() {
  const {
    // Data
    members,          // Filtered members (respects search/filters)
    allMembers,       // All members (sorted)
    invitations,      // Pending invitations

    // Filters
    filters,          // { search, roleFilter, userTypeFilter }
    setSearch,        // Update search query
    setRoleFilter,    // Filter by role (owner/admin/manager/member)
    setUserTypeFilter,// Filter by user type
    clearFilters,     // Reset all filters

    // Statistics
    stats,            // { totalMembers, pendingInvitations, byRole, byUserType }

    // Actions (same as useTeam + useInvitations)
    updateMemberRole,
    updateMemberUserType,
    removeMember,
    sendInvitation,
    resendInvitation,
    revokeInvitation,

    // State
    isLoading,
    isProcessing,
  } = useTeamManagement()
}
```

**New Components:**
- `UnifiedMemberCard.tsx` - Modern card for active members (replaces TeamMemberCard + UserCard)
- `InvitationCard.tsx` - Modern card for pending invitations (replaces PendingInvitationList)
- Both use consistent design system with gradients, badges, and hover effects

**Features:**
- ✅ Real-time search by name/email
- ✅ Filter by role (owner/admin/manager/member)
- ✅ Filter by user type (owner/traffic_manager/sales)
- ✅ Statistics dashboard (total members, pending invitations, growth rate)
- ✅ Tabs: Membros Ativos | Convites Pendentes
- ✅ Modern UI with gradients and animations
- ✅ Organization-scoped (multi-tenant safe)
- ✅ Owner-only permissions enforced

**Migration Notes:**
- Old pages (`Team.tsx`, `Users.tsx`) are deprecated but kept for reference
- Old components (`TeamMemberCard.tsx`, `PendingInvitationList.tsx`) are deprecated
- All functionality from both pages is now in `/equipe`
- No database migrations required (architecture unchanged)

### Authentication Flow

**Always use the `useAuth` hook:**
```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, session, loading, signIn, signOut, signUp } = useAuth()

  // user and session auto-sync with Supabase auth state
  // loading is true during initial auth check
}
```

**Available methods:**
- `signIn(email, password)` - Email/password login
- `signUp(email, password, metadata)` - New user registration
- `signOut()` - Logout
- `signInWithOAuth(provider)` - OAuth (Google, Facebook)
- `resetPasswordForEmail(email)` - Send reset email
- `updatePassword(newPassword)` - Update password

### Data Fetching Pattern

**Always use custom hooks (never direct Supabase queries in components):**

```typescript
// ✅ Correct: Use custom hooks (includes org scoping automatically)
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/useLeads'

function MyComponent() {
  const { data: leads, isLoading } = useLeads() // Already org-scoped
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  // Mutations include optimistic updates automatically
  await updateLead.mutateAsync({ id: 'xxx', values: { status: 'done' } })
}

// ❌ Avoid: Direct Supabase queries (missing org scope!)
// const { data } = await supabase.from('leads').select('*')
```

**Why use custom hooks:**
- Automatic organization scoping (critical for multi-tenancy)
- Automatic caching and refetching
- Optimistic updates on mutations
- Consistent error handling
- Loading states
- Type safety

### Optimistic Updates Pattern

All mutation hooks implement optimistic updates for instant UI feedback:

```typescript
export const useUpdateLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }) => { /* Supabase update */ },
    onMutate: async ({ id, values }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['leads'] })

      // Snapshot previous state
      const previousLeads = queryClient.getQueryData(['leads'])

      // Optimistically update cache
      queryClient.setQueryData(['leads'], (old) => /* update */)

      return { previousLeads }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })
}
```

### Form Handling

Forms use **React Hook Form + Zod** for validation:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.number().min(0).optional(),
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { title: '', value: 0 },
})
```

See [NewLeadModal.tsx](src/components/leads/NewLeadModal.tsx) for complete example.

### Drag and Drop (Kanban)

Leads page uses `@hello-pangea/dnd`:
- `DragDropContext` wraps the board
- Each column is a `Droppable`
- Cards are `Draggable` items
- Movement history tracked in `lead_activity` table

## Important Configuration

### Port Configuration

Dev server runs on **port 8082** (configured in [vite.config.ts](vite.config.ts)):
```typescript
server: {
  host: "::",
  port: 8082,
}
```

### Path Aliases

Always use `@/` imports:
```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
```

Configured in [tsconfig.json](tsconfig.json):
```json
"paths": { "@/*": ["./src/*"] }
```

### Environment Variables

Required in `.env` (see [.env.example](.env.example)):
```env
# Supabase (client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:8082

# Meta Ads OAuth
VITE_META_REDIRECT_URI=http://localhost:8082/meta-ads-config

# Supabase Edge Functions (server-side only, never expose to client)
# Set these as Supabase secrets: supabase secrets set KEY="value"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
```

**Security Note:** Service role keys should NEVER be in `.env` for client builds. Use Supabase Edge Functions for privileged operations.

### Vercel Deployment

Configured in [vercel.json](vercel.json):
- SPA mode with rewrites to `/index.html`
- Cache headers for static assets (1 year)
- Framework detection: Vite

**Deploy:**
```bash
# Via Lovable (automatic)
lovable.dev/projects/9857f451-8bd1-47f6-9f7c-40342942a99a → Share → Publish

# Via Vercel CLI
vercel --prod

# Sync environment variables to Vercel
npm run sync:envs -- --prod
```

## Meta Ads Integration

The app includes Meta (Facebook) Business OAuth integration for ad campaign tracking:

**Files:**
- Route: [/meta-ads-config](src/pages/MetaAdsConfig.tsx)
- Hook: [useMetaAuth](src/hooks/useMetaAuth.ts)
- Edge Function: [meta-auth](supabase/functions/meta-auth/index.ts)
- Documentation: [docs/META_ADS_SETUP.md](docs/META_ADS_SETUP.md)

**Flow:**
1. User clicks "Connect Meta Business" in `/meta-ads-config`
2. `useMetaAuth.connectMetaBusiness()` calls `meta-auth` Edge Function
3. Edge Function returns Meta OAuth URL
4. User authorizes on Meta → redirected back with auth code
5. `useMetaAuth` exchanges code for access token via Edge Function
6. Token stored in `meta_business_connections` table
7. Ad accounts synced to `ad_accounts` table

**Scripts:**
```bash
npm run verify:meta              # Verify Meta credentials
./scripts/setup-meta-secrets.sh  # Set up Meta secrets in Supabase
```

## Lovable Integration

- Uses `lovable-tagger` plugin in development mode (auto-tags components)
- Changes made in Lovable IDE are committed automatically
- Local changes should be pushed to sync with Lovable
- URL: https://lovable.dev/projects/9857f451-8bd1-47f6-9f7c-40342942a99a

## Styling System & UI/UX Guidelines

### Design System Overview

**IMPORTANT:** The project follows a strict design system documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). **ALL new components and pages MUST follow these guidelines** to maintain visual consistency.

### Core Technologies
- **Tailwind CSS** with custom theme in [tailwind.config.ts](tailwind.config.ts)
- **CSS Variables** for colors via HSL (defined in [src/index.css](src/index.css))
- Custom animations: `fade-in`, `slide-in`, `scale-in`, `pulse-glow`, `hover-lift`
- Dark mode ready with `class` strategy (via `next-themes`)
- shadcn-ui components configured in [components.json](components.json)

### Official Color Palette

**Primary Colors:**
- `--primary`: `200 100% 56%` (#2DA7FF) - Main actions, CTAs, links
- `--secondary`: `202 100% 52%` (#0D9DFF) - Highlights, animations, accents
- `--background`: `218 56% 14%` (#071D33) - Main app background
- `--foreground`: `206 20% 92%` (#EBEFF3) - Main text color

**Surface Colors:**
- `--card`: `218 45% 18%` - Card backgrounds
- `--muted`: `218 35% 25%` - Secondary surfaces
- `--border`: `218 25% 30%` - Borders and dividers

**Status Colors:**
- `--success`: `142 76% 36%` (#16A34A) - Success states, active status
- `--warning`: `38 92% 50%` (#F59E0B) - Warning states, attention
- `--destructive`: `0 84% 60%` (#EF4444) - Error states, deletion

### Standard Gradients

**Primary Gradient (for icons, buttons, highlights):**
```tsx
className="bg-gradient-to-br from-primary to-secondary"
```

**Card Gradient (for elevated cards):**
```tsx
className="bg-gradient-to-br from-card to-accent/20"
```

**Hero Gradient (for page headers):**
```tsx
className="bg-gradient-to-r from-background to-secondary"
```

### Component Patterns

**Page Header:**
```tsx
<div className="flex items-center gap-3">
  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
    <IconComponent className="w-7 h-7 text-white" />
  </div>
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-foreground">Page Title</h1>
    <p className="text-muted-foreground mt-1">Page description</p>
  </div>
</div>
```

**Standard Card:**
```tsx
<Card className="border-border bg-card">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
    <CardDescription className="text-muted-foreground">Description</CardDescription>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
</Card>
```

**Elevated Card (with hover effect):**
```tsx
<Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
  {/* Content */}
</Card>
```

**Primary Button:**
```tsx
<Button className="bg-primary hover:bg-primary/90">Action</Button>
```

**Status Badges:**
```tsx
{/* Active */}
<Badge className="bg-success text-success-foreground">Active</Badge>

{/* Inactive */}
<Badge className="bg-muted text-muted-foreground">Inactive</Badge>
```

**Icon Container (gradient background):**
```tsx
<div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
  <IconComponent className="w-6 h-6 text-white" />
</div>
```

**Status Indicators:**
```tsx
{/* Connected */}
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
  <span className="text-sm font-medium text-success">Connected</span>
</div>

{/* Disconnected */}
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
  <span className="text-sm font-medium text-muted-foreground">Disconnected</span>
</div>
```

### Typography Standards

- **H1 (Page Title):** `text-3xl font-bold tracking-tight text-foreground`
- **H2 (Section Title):** `text-2xl font-bold text-foreground`
- **H3 (Card Title):** `text-xl font-bold text-foreground`
- **Body Text:** `text-base text-foreground`
- **Secondary Text:** `text-muted-foreground`
- **Small Text:** `text-sm text-muted-foreground`
- **Extra Small:** `text-xs text-muted-foreground`

### Spacing Standards

- **Between sections:** `space-y-6` or `space-y-8`
- **Grid gaps:** `gap-6` (primary) or `gap-4` (secondary)
- **Card padding:** `p-6` (standard), `p-4` (compact)
- **Container margins:** `mb-4`, `mb-6`, `mt-2`, `mt-4`

### Animation & Effects

- **Hover lift:** Add `hover-lift` class for subtle elevation on hover
- **Fade in:** Add `animate-fade-in` class for entrance animations
- **Transitions:** All interactive elements should use smooth transitions (`transition-all duration-300`)

### UI/UX Rules

1. **ALWAYS use CSS variables** for colors (e.g., `bg-primary`, `text-foreground`) instead of hardcoded values
2. **Maintain visual hierarchy** with consistent font sizes and weights
3. **Use gradients sparingly** - only for highlights and hero elements
4. **Add hover states** to all interactive elements
5. **Include loading states** for async operations
6. **Show toast notifications** for user actions (success, error, info)
7. **Implement optimistic updates** for better perceived performance
8. **Use icons consistently** - all major icons should use gradient backgrounds
9. **Respect spacing standards** - don't create custom spacing values
10. **Test responsiveness** - use responsive classes (sm:, md:, lg:, xl:)

### Reference Examples

- **Dashboard:** See [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) for KPI cards, charts, and metrics
- **Leads:** See [src/pages/Leads.tsx](src/pages/Leads.tsx) for Kanban board styling
- **Meta Ads Config:** See [src/pages/MetaAdsConfig.tsx](src/pages/MetaAdsConfig.tsx) for integration pages
- **Components:** See [src/components/meta-ads/](src/components/meta-ads/) for modern component patterns

### Consistency Checklist

When creating new UI components, verify:
- ✅ Uses official color palette (primary, secondary, success, etc.)
- ✅ Follows gradient patterns for highlighted elements
- ✅ Includes hover states and smooth transitions
- ✅ Uses standard spacing (gap-6, space-y-6, p-6)
- ✅ Implements proper typography hierarchy
- ✅ Shows loading and error states
- ✅ Includes toast notifications for user feedback
- ✅ Tests on different screen sizes
- ✅ Maintains visual consistency with existing pages

## TypeScript Configuration

- Path alias: `@/*` → `./src/*`
- Loose strictness: `noImplicitAny: false`, `strictNullChecks: false`
- React SWC plugin for fast refresh
- Auto-generated database types from Supabase CLI

## ESLint Configuration

- Unused variables warning disabled
- React Refresh warnings enabled for HMR
- React Hooks rules enforced

## Database Migrations

**Important**: When creating new tables or modifying schema:

1. **Always add organization_id column** to new tables that store user data
2. **Add RLS policies** to filter by organization
3. **Create migration file** in `supabase/migrations/` with format `YYYYMMDD_description.sql`
4. **Test locally** with `npx supabase db reset` before pushing
5. **Push to remote** with `npx supabase db push`
6. **Regenerate types** with `npx supabase gen types typescript`

```sql
-- Example: Adding org-scoped table
CREATE TABLE my_new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- other columns
);

-- ALWAYS add RLS
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's data"
  ON my_new_table FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );
```

## Additional Documentation

- [DATABASE.md](DATABASE.md) - Complete schema and API reference
- [README.md](README.md) - Project overview and setup
- [docs/META_ADS_SETUP.md](docs/META_ADS_SETUP.md) - Meta Ads integration guide
- [docs/VERCEL_ENV_GUIDE.md](docs/VERCEL_ENV_GUIDE.md) - Vercel deployment guide

## Common Issues & Troubleshooting

### "No organization found" error
- User is not a member of any organization
- Check `organization_memberships` table
- May need to create first organization or accept invitation

### Data not showing in queries
- Missing `organization_id` filter in query
- User's organization membership is `is_active = false`
- RLS policy blocking access

### TypeScript type errors after schema changes
- Run `npx supabase gen types typescript --project-id YOUR_PROJECT > src/lib/database.types.ts`
- Restart TypeScript server in IDE

### Edge Function not deploying
- Check function has proper structure (`index.ts` in function folder)
- Verify Supabase CLI is logged in: `npx supabase login`
- Check function logs: `npx supabase functions logs FUNCTION_NAME`
