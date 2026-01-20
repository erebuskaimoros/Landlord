# Landlord

Property management CRM for landlords managing single-family residential portfolios (50-200+ units). Centralized hub for units, tenants, contractors, finances, and maintenance.

## Tech Stack

- **Database:** PostgreSQL via Supabase (RLS for multi-tenant isolation)
- **Backend:** Supabase + Edge Functions
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Mobile:** React Native (Expo) - future phase
- **Hosting:** Vercel

## Project Structure

```
landlord/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── (auth)/           # Public auth routes (login, signup)
│   │   │   └── (dashboard)/      # Protected dashboard routes
│   │   ├── components/           # React components
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── layout/           # Layout components
│   │   │   ├── forms/            # Entity forms
│   │   │   └── tables/           # Data tables
│   │   ├── lib/                  # Utilities and config
│   │   │   ├── supabase/         # Supabase clients
│   │   │   └── validations/      # Zod schemas
│   │   ├── services/             # Data access layer
│   │   └── types/                # TypeScript types
│   ├── e2e/                      # Playwright tests
│   └── playwright.config.ts
├── supabase/
│   └── migrations/               # Database migrations
├── knowledge/                    # Project documentation
└── spec-detailed.md              # Technical specification
```

## Key Concepts

### Multi-tenant Architecture
All data is scoped to organizations via `organization_id`. Row Level Security (RLS) ensures complete data isolation between organizations.

### User Roles
- **Owner**: Full access including delete and financial data
- **Manager**: Can create and edit, but not delete
- **Viewer**: Read-only access

### Core Entities
- **Units**: Rental properties with full address, property details, status
- **Buildings**: Optional container for multi-unit properties
- **Tenants**: People who rent units with contact info
- **Leases**: Connects tenants to units with dates and terms
- **Transactions**: Financial ledger (income/expense) with IRS Schedule E categories

## Knowledge System

Project documentation lives in `knowledge/`:

- `knowledge/sessions/` - Session logs documenting work done
- `knowledge/sessions/_index.md` - Index of recent sessions and current work in progress
- `knowledge/phase1-implementation-plan.md` - Detailed implementation plan for Phase 1
- `spec-detailed.md` - Comprehensive technical specification

Start new sessions by reading `knowledge/sessions/_index.md` to understand current state.

## Development Commands

```bash
# Start development server
cd app && npm run dev

# Run tests
cd app && npm run test          # Unit tests (Vitest)
cd app && npm run test:e2e      # E2E tests (Playwright)

# Database
supabase start                   # Start local Supabase
supabase db reset               # Reset and apply migrations
supabase migration new <name>   # Create new migration

# Build
cd app && npm run build         # Production build
cd app && npm run lint          # Lint check
```

## Database Migrations

Migrations are in `supabase/migrations/`:
1. `00001_initial_schema.sql` - Core tables and indexes
2. `00002_rls_policies.sql` - Row Level Security policies
3. `00003_audit_triggers.sql` - Automatic change tracking
4. `00004_seed_categories.sql` - Default transaction categories
5. `00005_rls_hardening.sql` - Security and performance improvements

## Environment Variables

Required for `app/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

See `knowledge/DEPLOYMENT.md` for full deployment guide.
