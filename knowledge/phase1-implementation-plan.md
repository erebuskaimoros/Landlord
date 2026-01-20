# Phase 1 Implementation Plan: Landlord Property Management SaaS

## Overview

Phase 1 builds the **Core Foundation** for the Landlord property management platform:
- User auth and organization setup
- Unit CRUD with basic info
- Building container
- Tenant management with lease tracking
- Basic financial ledger

## Tech Stack
- **Database:** PostgreSQL via Supabase (with RLS for multi-tenant isolation)
- **Backend:** Supabase + Edge Functions
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Hosting:** Vercel

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant container (portfolios) |
| `organization_members` | Links users to orgs with roles (owner/manager/viewer) |
| `organization_invitations` | Pending invites with tokens |
| `user_profiles` | Extended user data |
| `buildings` | Optional grouping for multi-unit properties |
| `units` | Primary rentable entity |
| `building_unit_allocations` | Expense split percentages |
| `tenants` | People who rent units |
| `leases` | Connects tenants to units with terms |
| `lease_documents` | PDF attachments (Supabase Storage) |
| `tenant_timeline_events` | Customizable event log |
| `transaction_categories` | IRS Schedule E aligned categories |
| `transactions` | Financial ledger (AR/AP) |
| `transaction_allocations` | For split/shared expenses |
| `audit_logs` | Immutable change history |

### Key Design Decisions

1. **Organization-based multi-tenancy** with RLS - all data scoped to `organization_id`
2. **Linked tenancy model** - one tenant record can have multiple lease periods
3. **JSONB audit logs** - flexibility for schema changes over time
4. **Trigger-based auditing** - captures all changes regardless of source

---

## Project Structure

```
landlord/
├── src/
│   ├── app/                     # App Router pages
│   │   ├── (auth)/              # Auth routes (login, signup, etc.)
│   │   ├── (dashboard)/         # Protected routes
│   │   │   ├── units/
│   │   │   ├── buildings/
│   │   │   ├── tenants/
│   │   │   ├── leases/
│   │   │   ├── transactions/
│   │   │   └── settings/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── layout/              # Sidebar, header, nav
│   │   ├── forms/               # Entity forms
│   │   ├── tables/              # Data tables
│   │   ├── cards/               # Card components
│   │   └── shared/              # Reusable utilities
│   ├── lib/
│   │   ├── supabase/            # Client configs
│   │   ├── utils.ts
│   │   └── validations/         # Zod schemas
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript types
│   ├── stores/                  # Zustand state
│   └── services/                # Data access layer
├── supabase/
│   ├── migrations/              # SQL migrations
│   └── functions/               # Edge Functions
└── tests/
```

---

## Implementation Order (Vertical Slices)

Build thin end-to-end slices across all features, then iterate to add depth.

### Slice 1: Skeleton + Auth
**Goal:** Working app shell with authentication
1. Initialize Next.js 14 + TypeScript + Tailwind + shadcn/ui
2. Set up Supabase project (local + remote)
3. Create ALL database tables (minimal fields initially)
4. Basic RLS policies (organization isolation)
5. Auth: login/signup/logout only (no OAuth yet)
6. Dashboard layout shell (sidebar, header)
7. **Tests:** Auth E2E flow, RLS isolation test
8. **Files:** All migrations, `src/lib/supabase/`, `src/app/(auth)/login/`, `src/app/(dashboard)/layout.tsx`

### Slice 2: First Entity - Units (MVP)
**Goal:** One complete CRUD entity as the pattern
1. Units table/list (basic - address only)
2. Unit create form (address only)
3. Unit detail page
4. Unit service layer
5. Unit Zod validation
6. **Tests:** Unit service tests, Unit form tests, Units E2E
7. **Files:** `src/app/(dashboard)/units/`, `src/services/units.ts`, `src/lib/validations/unit.ts`

### Slice 3: Remaining Entities (Basic CRUD)
**Goal:** All entities working at basic level
1. Buildings - basic CRUD (name + address)
2. Tenants - basic CRUD (name + contact)
3. Leases - basic CRUD (tenant + unit + dates + rent)
4. Transactions - basic CRUD (type + category + amount)
5. **Tests:** Service tests + basic E2E for each
6. **Files:** All entity pages, services, validations

### Slice 4: Relationships & Business Logic
**Goal:** Entities connected, core workflows working
1. Link units to buildings
2. Link leases to tenants and units
3. Link transactions to units/tenants
4. Unit status auto-update from leases
5. Tenant timeline events
6. Building expense allocations
7. **Tests:** Integration tests for relationships

### Slice 5: Full Field Coverage
**Goal:** All spec fields implemented
1. Units: full property details, notes
2. Tenants: emergency contact, full profile
3. Leases: security deposit, terms, documents
4. Transactions: expected vs actual, running balance
5. Progressive disclosure prompts for units
6. **Tests:** Validation tests for all fields

### Slice 6: Organization & Team
**Goal:** Multi-user support
1. Organization settings page
2. Team member management
3. Invitation system (Edge Function)
4. Role-based UI visibility
5. OAuth (Google, Apple)
6. **Tests:** Invitation E2E, role permission tests

### Slice 7: Dashboard & Polish
**Goal:** Complete UX
1. Dashboard stats and overview
2. Global search
3. Audit log viewer
4. Mobile responsive pass
5. Loading/empty states everywhere
6. Error handling improvements
7. **Tests:** Dashboard E2E, search tests

### Slice 8: Hardening
**Goal:** Production ready
1. Final RLS policy audit
2. Performance optimization
3. Accessibility pass
4. Full E2E test suite pass
5. Documentation

---

## Critical Files to Create

### Database (create first - everything depends on this)
- `supabase/migrations/00001_initial_schema.sql` - All tables
- `supabase/migrations/00002_rls_policies.sql` - Security policies
- `supabase/migrations/00003_audit_triggers.sql` - Change tracking
- `supabase/migrations/00004_seed_categories.sql` - Default transaction categories

### Supabase Client
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client with cookies
- `src/lib/supabase/middleware.ts` - Auth middleware

### Core Layout
- `src/app/(dashboard)/layout.tsx` - Sidebar, org context, auth guards
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`

### Service Pattern (replicate for all entities)
- `src/services/units.ts` - Demonstrates query patterns
- `src/lib/validations/unit.ts` - Zod schema pattern

---

## User Roles & Permissions

| Role | View | Create/Edit | Delete | Financials |
|------|------|-------------|--------|------------|
| Owner | All | All | All | Full access |
| Manager | All | All | No | No aggregate views |
| Viewer | All | No | No | Read-only |

**Implementation:** RLS policies at database level + application-layer filtering for nuanced rules.

---

## Testing Strategy

1. **Unit Tests (Vitest):** Utilities, Zod schemas, hooks - 90%+ coverage
2. **Integration Tests:** Service layer with mocked Supabase, RLS verification
3. **E2E Tests (Playwright):** Critical flows - auth, unit CRUD, transactions

### Critical E2E Flows
- [ ] Sign up → Create organization → Invite team member
- [ ] Create unit (progressive disclosure)
- [ ] Create tenant → Create lease → Upload document
- [ ] Record transaction → View ledger → Check balance

---

## Verification Checklist

After implementation:
1. [ ] Run `supabase db reset` and verify migrations apply cleanly
2. [ ] Test RLS: User A cannot see User B's data
3. [ ] Test roles: Viewer cannot edit, Manager cannot delete
4. [ ] Create unit with minimal info, verify prompts for more
5. [ ] Create tenant → lease → verify unit status updates
6. [ ] Record income/expense, verify running balance
7. [ ] Check audit_logs table has entries for all changes
8. [ ] Test on mobile viewport (responsive)
9. [ ] Run full E2E test suite
10. [ ] Deploy to Vercel preview, test with production Supabase

---

## Estimated Scope

- **~150 files** total
- **30 pages/routes**
- **~80 components**
- **8 services**
- **4 database migrations**
- **~50 test files**
