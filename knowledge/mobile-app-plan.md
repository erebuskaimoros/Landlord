# Mobile App Implementation Plan

> Last updated: 2026-01-15
> Status: MVP complete - offline support, photo geolocation, task photos

## Overview

React Native (Expo) mobile app for the Landlord property management CRM. The MVP focuses on field-oriented features with full offline support.

**Target**: iOS + Android simultaneously via Expo
**Location**: `mobile/` directory alongside existing `app/`

## MVP Features (Field-Focused)

- **Tasks**: View, update status, attach before/after photos
- **Photos**: Quick capture with GPS coordinates, linked to units and tasks
- **Units**: Search/lookup by address
- **Contacts**: Tap-to-call/text for tenants and contractors
- **Dashboard**: Key metrics (open tasks, overdue, urgent)
- **Offline**: SQLite cache + write queue with auto-sync

---

## Project Structure

```
landlord/
├── app/                          # Existing Next.js web app
├── mobile/                       # React Native app
│   ├── app/                      # Expo Router pages
│   │   ├── (auth)/              # login.tsx
│   │   ├── (tabs)/              # Bottom nav screens
│   │   │   ├── index.tsx        # Dashboard
│   │   │   ├── tasks.tsx        # Tasks list
│   │   │   ├── units.tsx        # Units lookup
│   │   │   ├── camera.tsx       # Quick photo
│   │   │   ├── more.tsx         # Settings
│   │   │   └── _layout.tsx
│   │   ├── tasks/[id].tsx       # Task detail
│   │   └── units/[id].tsx       # Unit detail
│   ├── src/
│   │   ├── components/ui/       # Button, Card, Badge, etc.
│   │   ├── hooks/               # useNetworkState, usePhotoLocation
│   │   ├── lib/
│   │   │   ├── supabase/        # Mobile Supabase client
│   │   │   └── offline/         # SQLite cache, sync queue
│   │   ├── services/            # Adapted from web services
│   │   └── store/               # Zustand stores
│   ├── app.json
│   ├── package.json
│   └── eas.json
└── supabase/                    # Database migrations
```

---

## Implementation Status

### Completed

- [x] **Phase 1: Project Setup** - Expo project, permissions, EAS config
- [x] **Phase 2: Core Infrastructure** - Supabase client, auth store, shared types
- [x] **Phase 3: Offline Architecture** - SQLite cache, sync queue, network state management
- [x] **Phase 4: Core Screens** - Dashboard, Tasks, Units, Camera, More
- [x] **Phase 5: Photo System** - Camera capture with geolocation
- [x] **Phase 6: Contact Integration** - Tap-to-call/text

### Pending

- [ ] **Phase 7: Polish & Deployment** - Push notifications, testing, builds

---

## Offline Architecture (Implemented)

### SQLite Cache (`mobile/src/lib/offline/database.ts`)

Cache tables: `cached_units`, `cached_tasks`, `cached_contractors`, `cached_tenants`, `cached_leases`, `cached_photos`

- Uses expo-sqlite v16+ async API
- JSON-serialized rows for flexible schema
- Indexed by organization_id for efficient queries
- `cache_metadata` table tracks last sync time per table

### Sync Queue (`mobile/src/lib/offline/sync-queue.ts`)

```typescript
interface SyncQueueItem {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  data: Record<string, unknown>
  timestamp: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  retry_count: number
  error_message?: string
}
```

- Persisted in SQLite `sync_queue` table
- Max 3 retries before marking permanently failed
- Auto-sync when connection restored
- Processes queue sequentially to maintain order

### Offline Store (`mobile/src/store/offline.ts`)

Zustand store providing:
- `isOnline` - current network status
- `isSyncing` - sync in progress flag
- `pendingSyncCount` - items waiting to sync
- `syncData(orgId)` - fetch and cache all data
- `processQueue()` - sync pending changes
- Network listener for auto-sync on reconnect

### Offline-First Hooks (`mobile/src/hooks/useOfflineData.ts`)

- `useOfflineTasks()` - tasks with cache fallback
- `useOfflineTask(id)` - single task
- `useOfflineUnits()` - units with cache fallback
- `useOfflineUnit(id)` - single unit
- `useOfflineContractors()` - contractors with cache fallback
- `useOfflineMutation()` - mutations that queue offline

### UI Components (`mobile/src/components/ui/OfflineIndicator.tsx`)

- `OfflineIndicator` - floating banner showing offline/pending status
- `OfflineBanner` - compact banner for embedding in headers
- Auto-hides when online with no pending changes

---

## Key Files Reference

| Purpose | Web File | Mobile File |
|---------|----------|-------------|
| Types | `app/src/types/database.ts` | `mobile/src/types/database.ts` |
| Task service | `app/src/services/tasks.ts` | Adapt with offline queue |
| Photo service | `app/src/services/photos.ts` | Adapt with offline queue |
| Validations | `app/src/lib/validations/*.ts` | Share directly |

---

## Database Migrations

### `00014_add_photo_geolocation.sql`
Adds GPS coordinates to photos for mobile capture:
```sql
ALTER TABLE photos ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE photos ADD COLUMN longitude DECIMAL(11, 8);
CREATE INDEX idx_photos_location ON photos(latitude, longitude) WHERE latitude IS NOT NULL;
```

### `00015_add_task_photos.sql`
Links photos to tasks for before/after documentation:
```sql
ALTER TABLE photos ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_photos_task_id ON photos(task_id) WHERE task_id IS NOT NULL;
```

---

## Key Dependencies

```json
{
  "expo": "~54.0.0",
  "expo-router": "~6.0.0",
  "expo-camera": "~16.0.0",
  "expo-location": "~18.0.0",
  "expo-sqlite": "~15.0.0",
  "expo-secure-store": "~14.0.0",
  "expo-file-system": "~18.0.0",
  "@supabase/supabase-js": "^2.90.0",
  "zustand": "^5.0.0",
  "@tanstack/react-query": "^5.0.0",
  "@react-native-community/netinfo": "^11.0.0"
}
```

---

## Development Commands

```bash
# Start dev server
cd mobile && npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Create development build
eas build --profile development --platform all

# Create preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all
```

---

## Testing Checklist

1. **Auth**: Login with existing web credentials
2. **Dashboard**: Task counts display correctly
3. **Tasks**: Filter, view detail, update status
4. **Units**: Search by address, view detail
5. **Photos**: Capture with location, upload to storage
6. **Contacts**: Tap phone opens dialer/SMS
7. **Offline** (when implemented): Cache displays, writes queue, sync works
