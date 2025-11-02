Organization name management

Overview
- Single source of truth is `public.organizations.name` in Supabase.
- The app reads the active organization via `useActiveOrganization()`.
- A reusable UI `OrganizationNameEditor` allows owners to rename the company.

Where it appears
- CRM: headers, permissions, and plan limits derived from the active org.
- Forms: vanity URLs and UI reference the active org (slug/name context).
- Profile and team: descriptive headers show the org name.

How updates propagate
- Hook `useUpdateOrganizationName()` updates Supabase and invalidates:
  - `active-organization` (immediate re-render)
  - `organization-plan-limits` (limits include `organization_name`)
  - `user-permissions`, `current-subscription`, `subscription-payments`
- Optimistic update ensures UI switches instantly before roundtrip.

Manual QA
- Go to Team Management and rename the company.
- Confirm new name appears in:
  - Team and Team Management headers
  - Subscription pages that show org name
  - Form list vanity URL context where applicable

Files
- src/components/organization/OrganizationNameEditor.tsx
- src/hooks/useOrganization.ts
- src/pages/TeamManagement.tsx (uses the editor)

