# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Metricom Flow** CRM application built with Vite, React, TypeScript, shadcn-ui, and Tailwind CSS. Originally created with Lovable (lovable.dev), it focuses on lead management, revenue tracking, and goal monitoring for B2B sales teams.

## Key Commands

### Development
```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Installation
```bash
npm i                # Install dependencies
```

## Architecture

### Routing Structure
The app uses **React Router v6** with v7 future flags enabled and a nested layout pattern:
- `/` - Auth page (login/register)
- `/setup-admin` - First-time admin setup
- `/auth/forgot-password` - Password recovery
- `/auth/update-password` - Password reset after recovery
- `/auth/callback` - OAuth callback handler
- `/dashboard` - Overview with KPIs and charts (protected)
- `/leads` - Kanban board for lead management (protected)
- `/metas` - Goals tracking for clients (protected)
- `/meta-ads-config` - Meta Ads integration settings (protected)

All authenticated routes are wrapped by `ProtectedRoute` component, then by `AppLayout` which provides the sidebar and header.

### Core Layout Pattern
```
App.tsx (QueryClient, AuthProvider, TooltipProvider, BrowserRouter)
  ├─ Public Routes: Auth (/), SetupAdmin, ForgotPassword, etc.
  └─ ProtectedRoute (requires authentication)
      └─ AppLayout (nested routes)
          ├─ AppSidebar (collapsible navigation)
          ├─ Header (top bar)
          └─ Outlet (Dashboard, Leads, Metas, MetaAdsConfig)
```

### State Management
- **TanStack Query** (@tanstack/react-query) is configured at the App level for data fetching
- **Supabase** (@supabase/supabase-js) for database and authentication
- **AuthContext** (`src/context/AuthContext.tsx`) - Global auth state with user, session, and auth methods
- Local state with `useState` for UI interactions
- Custom hooks in `src/hooks/` encapsulate all data fetching logic:
  - `useAuth` - Authentication state and methods
  - `useLeads` - Lead CRUD operations with optimistic updates
  - `useDashboard` - KPIs and revenue data
  - `useClientGoals` - Goals tracking
  - `useLabels` - Tag management
  - `useMetaAuth` - Meta Ads OAuth integration

### Component Organization
```
src/
├── components/
│   ├── ui/          # shadcn-ui components (50+ components)
│   ├── layout/      # AppLayout, AppSidebar, Header
│   ├── auth/        # LoginForm, RegisterForm, ProtectedRoute
│   └── leads/       # NewLeadModal (form with validation)
├── pages/           # Route components (Dashboard, Leads, Metas, Auth, etc.)
├── context/         # AuthContext for global auth state
├── hooks/           # Custom hooks for data fetching and auth
│   ├── useAuth.ts
│   ├── useLeads.ts
│   ├── useDashboard.ts
│   ├── useClientGoals.ts
│   ├── useLabels.ts
│   ├── useMetaAuth.ts
│   ├── use-mobile.ts
│   └── use-toast.ts
└── lib/
    ├── utils.ts          # cn helper and utilities
    ├── supabase.ts       # Supabase client + authHelpers
    └── database.types.ts # Auto-generated TypeScript types
```

### Drag and Drop Implementation
The Leads page uses `@hello-pangea/dnd` for Kanban functionality:
- `DragDropContext` wraps the board
- Each column is a `Droppable`
- Cards are `Draggable` items
- Movement history is tracked and displayed below the board

### Styling System
- **Tailwind CSS** with custom theme extensions
- **CSS Variables** for colors via HSL (see tailwind.config.ts)
- Custom animations: `fade-in`, `slide-in`, `scale-in`, `pulse-glow`
- Utility classes: `hover-lift` for card interactions
- Dark mode ready with `["class"]` strategy

### TypeScript Configuration
- Path alias: `@/*` → `./src/*`
- Loose strictness: `noImplicitAny: false`, `strictNullChecks: false`
- React SWC plugin for fast refresh

## Development Patterns

### Authentication Flow
The app uses a centralized AuthContext for authentication:
```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, session, loading, signIn, signOut } = useAuth()

  // user and session are automatically synced with Supabase
  // loading is true during initial auth check
}
```

**Protected Routes:**
- Use `ProtectedRoute` component (wraps all authenticated routes in App.tsx)
- Automatically redirects to `/` if user is not authenticated
- Shows loading state while checking authentication

**Auth Operations:**
All auth methods are available through `useAuth` hook:
- `signIn(email, password)` - Email/password login
- `signUp(email, password, metadata)` - New user registration
- `signOut()` - Logout
- `signInWithOAuth(provider)` - OAuth login (Google, Facebook, etc.)
- `resetPasswordForEmail(email)` - Send password reset email
- `updatePassword(newPassword)` - Update user password

### Form Handling
Forms use **React Hook Form** + **Zod** for validation:
- See `NewLeadModal.tsx` for the pattern
- `@hookform/resolvers/zod` integration
- Toast notifications on form success

### Data Display
Charts use **Recharts** library:
- `ResponsiveContainer` wraps all charts
- Custom tooltips with dark theme styling
- See `Dashboard.tsx` and `Metas.tsx` for examples

### Optimistic Updates
Mutations in custom hooks implement optimistic updates for instant UI feedback:
```typescript
// Example from useLeads hook
export const useUpdateLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }) => { /* ... */ },
    onMutate: async ({ id, values }) => {
      // Cancel outgoing queries and update cache immediately
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousLeads = queryClient.getQueryData(['leads'])
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
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })
}
```

### Database Integration

The project uses **Supabase** (PostgreSQL) as the backend and is **fully integrated**:
- Complete schema in `supabase/migrations/001_initial_schema.sql`
- TypeScript types in `src/lib/database.types.ts` (auto-generated from Supabase CLI)
- Client configured in `src/lib/supabase.ts` with auth helpers
- Full documentation in `DATABASE.md`

**Integration Status:**
- ✅ Authentication fully implemented with AuthContext
- ✅ Custom hooks created for all data operations
- ✅ Optimistic updates configured in mutations
- ✅ Real-time data fetching with TanStack Query
- All pages now use Supabase data through custom hooks

**Data Fetching Pattern:**
All data operations use custom hooks that encapsulate TanStack Query:
```typescript
// Example: useLeads hook
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/useLeads'

function MyComponent() {
  const { data: leads, isLoading } = useLeads()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  // mutations include optimistic updates automatically
  await updateLead.mutateAsync({ id: 'xxx', values: { status: 'done' } })
}
```

## Important Notes

### Meta Ads Integration
The app includes Meta (Facebook) Ads integration:
- Route: `/meta-ads-config` (protected)
- Hook: `useMetaAuth` for OAuth flow
- Documentation: `docs/META_ADS_SETUP.md`
- Allows connecting Facebook Business accounts for ad campaign tracking

### Lovable Integration
- The project uses `lovable-tagger` plugin in development mode
- Changes made in Lovable IDE are committed automatically
- Local changes should be pushed to sync with Lovable

### Port Configuration
Dev server runs on port **8080** (not default 5173)

### Path Resolution
Always use `@/` imports for src files:
```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

### ESLint Configuration
- Unused variables warning is disabled
- React Refresh warnings enabled for HMR
- React Hooks rules enforced

## Database & Backend

### Supabase Setup
The project is configured to use Supabase as the backend:

**Setup Steps:**
1. Follow instructions in `SETUP_SUPABASE.md`
2. Create `.env` file with Supabase credentials
3. Run migration SQL in Supabase dashboard
4. Tables, views, and RLS policies are auto-created

**Database Schema:**
- 12 tables: profiles, leads, labels, comments, attachments, etc.
- 2 views: dashboard_kpis, monthly_revenue
- Automatic triggers for timestamps and activity logging
- Row Level Security (RLS) enabled on all tables

**Key Tables:**
- `leads` - Kanban cards with status (todo/doing/done)
- `lead_labels` - Many-to-many relationship for tags
- `lead_activity` - Audit trail of all changes
- `client_goals` - Goals with auto-calculated percentages
- `revenue_records` - Monthly revenue data for charts

**Authentication:**
Use the `useAuth` hook instead of calling `authHelpers` directly:
```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, signUp, signIn, signOut } = useAuth()

  // Sign up
  await signUp(email, password, { full_name: 'Name' })

  // Sign in
  await signIn(email, password)

  // Current user is available in the `user` variable
  console.log(user?.id, user?.email)
}
```

For direct access (not recommended in components, use the hook):
```typescript
import { authHelpers } from '@/lib/supabase'
await authHelpers.signIn(email, password)
```

**Data Fetching:**
Always use custom hooks instead of direct Supabase queries:
```typescript
// ✅ Recommended: Use custom hooks
import { useLeads } from '@/hooks/useLeads'
const { data: leads, isLoading } = useLeads()

// ❌ Avoid: Direct Supabase queries in components
// import { supabase } from '@/lib/supabase'
// const { data } = await supabase.from('leads').select('*')
```

Custom hooks provide:
- Automatic caching and refetching
- Optimistic updates on mutations
- Consistent error handling
- Loading states
- Type safety

See `DATABASE.md` for complete API documentation and examples.

### Environment Variables
Required in `.env` (see `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:8080  # For auth redirects
```

**Note:** Service role keys should NEVER be exposed to the client. Use Supabase Edge Functions for server-side operations requiring elevated privileges.
