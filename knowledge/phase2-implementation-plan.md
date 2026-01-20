# Phase 2 Implementation Plan: Operations

## Overview

Phase 2 adds operational features to the Landlord CRM:
- **Tasks/Work Orders** - Maintenance requests with status tracking
- **Contractors** - Vendor management with service types and ratings
- **Photos** - Media management with event-based albums
- **Assets** - Unit equipment tracking with receipts

## Entity Relationships

```
Unit
├── Tasks (work orders for this unit)
│   └── Photos (before/after documentation)
│   └── Contractor (assigned vendor)
├── Assets (appliances/systems)
│   └── Photos (receipts, manuals)
│   └── Asset Maintenance Logs
└── Photos (general unit photos by album)

Contractor (org-scoped, shared across units)
├── Tasks (jobs assigned to this contractor)
└── Contractor Ratings (from completed jobs)
```

## Database Schema

### New Tables

#### `contractors`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Optional |
| phone | VARCHAR(50) | Optional |
| address | TEXT | Optional |
| service_types | TEXT[] | Array: plumbing, electrical, hvac, etc. |
| hourly_rate | DECIMAL(10,2) | Optional |
| average_rating | DECIMAL(3,2) | Computed from ratings |
| total_jobs | INTEGER | Counter |
| notes | TEXT | Optional |
| created_at, updated_at | TIMESTAMPTZ | Standard |

#### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| unit_id | UUID FK | Required |
| title | VARCHAR(255) | Required |
| description | TEXT | Optional |
| status | ENUM | open, in_progress, completed, cancelled |
| priority | ENUM | low, medium, high, urgent |
| due_date | DATE | Optional |
| assigned_contractor_id | UUID FK | Optional |
| completed_at | TIMESTAMPTZ | When marked complete |
| completed_by | UUID FK | User who completed |
| estimated_cost | DECIMAL(10,2) | Optional |
| actual_cost | DECIMAL(10,2) | Optional |
| notes | TEXT | Optional |
| created_at, updated_at | TIMESTAMPTZ | Standard |

#### `assets`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| unit_id | UUID FK | Required |
| name | VARCHAR(255) | Required (e.g., "Kitchen Refrigerator") |
| asset_type | VARCHAR(100) | appliance, hvac, plumbing, electrical, other |
| make | VARCHAR(100) | Optional |
| model | VARCHAR(100) | Optional |
| serial_number | VARCHAR(100) | Optional |
| purchase_date | DATE | Optional |
| purchase_price | DECIMAL(10,2) | Optional |
| warranty_expiry | DATE | Optional |
| expected_lifespan_years | INTEGER | Optional |
| condition | ENUM | excellent, good, fair, poor |
| notes | TEXT | Optional |
| created_at, updated_at | TIMESTAMPTZ | Standard |

#### `photos`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| unit_id | UUID FK | Optional (null if asset/task only) |
| asset_id | UUID FK | Optional |
| task_id | UUID FK | Optional |
| file_path | TEXT | Storage bucket path |
| file_name | VARCHAR(255) | Original filename |
| file_size | INTEGER | Bytes |
| mime_type | VARCHAR(100) | image/jpeg, image/png, etc. |
| event_type | ENUM | move_in, move_out, maintenance, inspection, general |
| caption | TEXT | Optional description |
| taken_at | TIMESTAMPTZ | Photo date (defaults to upload) |
| created_at | TIMESTAMPTZ | Upload timestamp |

#### `contractor_ratings`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| contractor_id | UUID FK | Required |
| task_id | UUID FK | Optional (link to job) |
| rating | INTEGER | 1-5 stars |
| feedback | TEXT | Optional comments |
| rated_by | UUID FK | User who rated |
| created_at | TIMESTAMPTZ | |

#### `asset_maintenance_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| asset_id | UUID FK | Required |
| task_id | UUID FK | Optional (link to work order) |
| service_date | DATE | Required |
| description | TEXT | Required |
| cost | DECIMAL(10,2) | Optional |
| performed_by | VARCHAR(255) | Contractor name or "self" |
| created_at | TIMESTAMPTZ | |

#### `recurring_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | Required |
| unit_id | UUID FK | Required |
| title | VARCHAR(255) | Task template title |
| description | TEXT | Optional |
| priority | ENUM | low, medium, high, urgent |
| interval_days | INTEGER | Days between occurrences |
| next_due_date | DATE | Next scheduled date |
| last_generated_at | TIMESTAMPTZ | When last task was created |
| assigned_contractor_id | UUID FK | Optional default contractor |
| is_active | BOOLEAN | Enable/disable scheduling |
| created_at, updated_at | TIMESTAMPTZ | Standard |

### New Storage Bucket

**`unit-photos`** bucket:
- 10MB file size limit
- Allowed types: image/jpeg, image/png, image/webp, image/heic
- Path structure: `{organization_id}/{unit_id}/{event_type}/{timestamp}-{filename}`

### RLS Policies

Follow Phase 1 pattern:
- SELECT: All org members can view
- INSERT/UPDATE: Requires manager role
- DELETE: Requires owner role
- Audit triggers on all new tables

### Indexes

- `idx_tasks_org_status` - Dashboard queries
- `idx_tasks_org_unit` - Unit detail page
- `idx_tasks_org_contractor` - Contractor detail page
- `idx_tasks_due_date` - Overdue task queries
- `idx_photos_unit` - Unit photo gallery
- `idx_photos_task` - Task photos
- `idx_assets_unit` - Unit assets list
- `idx_contractors_org` - Contractor list

## Implementation Slices

### Slice 1: Contractors CRUD
1. Migration: `00007_contractors.sql`
2. Types: Update `database.ts`
3. Validation: `lib/validations/contractor.ts`
4. Service: `services/contractors.ts`
5. Actions: `app/(dashboard)/contractors/actions.ts`
6. Components: `ContractorForm`, `ContractorTable`
7. Pages: List + Detail pages
8. Tests: Service + validation tests

### Slice 2: Tasks/Work Orders
1. Migration: `00008_tasks.sql` (includes recurring_tasks table)
2. Types + Validation + Service
3. Status workflow UI (Open → In Progress → Completed)
4. Contractor assignment dropdown
5. Due date with overdue highlighting
6. Priority badges
7. Unit association (required)
8. List/Detail pages with filtering
9. Recurring task templates with interval scheduling
10. Auto-generate tasks when next_due_date is reached

### Slice 3: Assets
1. Migration: `00009_assets.sql`
2. Types + Validation + Service
3. Asset types dropdown
4. Warranty tracking with expiry alerts
5. Unit association (required)
6. Condition status
7. List/Detail pages

### Slice 4: Photos & Storage
1. Migration: `00010_photos.sql` + storage bucket
2. Photo upload service (following lease-documents pattern)
3. **Bulk upload support** - select multiple photos at once
4. Event type tagging (move-in, move-out, etc.)
5. Photo gallery component with grid view
6. Unit photos tab organized by event type
7. Task before/after photos
8. Asset photos (receipts, manuals)

### Slice 5: Contractor Ratings
1. Migration: `00011_contractor_ratings.sql`
2. Rating component (1-5 stars)
3. Rate on task completion
4. Average rating calculation (trigger or query)
5. Display on contractor detail

### Slice 6: Asset Maintenance Logs
1. Migration: `00012_asset_maintenance.sql`
2. Log entries linked to assets
3. Optional task linking
4. Service history timeline on asset detail

### Slice 7: Integration & Polish
1. Dashboard updates (open tasks count, overdue tasks)
2. Unit detail page: Tasks, Assets, Photos tabs
3. Global search: Add tasks, contractors
4. Navigation updates
5. E2E tests for Phase 2 flows

## Verification Plan

1. **Unit Tests**: Service + validation tests for all new entities
2. **E2E Tests**:
   - Create contractor → Create task → Assign contractor → Complete → Rate
   - Add asset → Upload photo → Log maintenance
   - Unit photos by event type
3. **Manual Testing**:
   - CRUD operations for all entities
   - Permission checks (manager can create, only owner can delete)
   - File upload/download for photos
   - Dashboard stats include new data

## Decisions

1. **Task-to-expense linking**: Deferred to Phase 3 (Financial Depth)
2. **Recurring tasks**: Yes, include basic interval scheduling
3. **Photo bulk upload**: Yes, support multiple photos at once

## Files to Create/Modify

### New Files
- `supabase/migrations/00007_contractors.sql` through `00012_...`
- `app/src/lib/validations/contractor.ts`, `task.ts`, `asset.ts`, `photo.ts`
- `app/src/services/contractors.ts`, `tasks.ts`, `assets.ts`, `photos.ts`
- `app/src/components/forms/contractor-form.tsx`, `task-form.tsx`, `asset-form.tsx`
- `app/src/components/tables/contractor-table.tsx`, `task-table.tsx`, `asset-table.tsx`
- `app/src/components/photos/photo-gallery.tsx`, `photo-upload.tsx`
- `app/src/(dashboard)/contractors/`, `tasks/`, `assets/` page directories

### Modified Files
- `app/src/types/database.ts` - Add new table types
- `app/src/app/(dashboard)/layout.tsx` - Navigation links
- `app/src/app/(dashboard)/units/[id]/` - Add tabs for tasks, assets, photos
- `app/src/app/(dashboard)/dashboard/` - Update stats
- `app/src/lib/supabase/` - Storage helpers if needed
