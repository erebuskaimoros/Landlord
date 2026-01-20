import * as SQLite from 'expo-sqlite'

// Open database - expo-sqlite v16+ uses async API
let db: SQLite.SQLiteDatabase | null = null

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('landlord_cache.db')
    await initializeDatabase(db)
  }
  return db
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create cache metadata table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cache_metadata (
      table_name TEXT PRIMARY KEY,
      last_synced_at TEXT,
      organization_id TEXT
    );
  `)

  // Create sync queue table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT
    );
  `)

  // Create cached tables for offline read access
  // Units cache (with latitude/longitude for offline proximity matching)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_units (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_units_org ON cached_units(organization_id);
    CREATE INDEX IF NOT EXISTS idx_cached_units_location ON cached_units(latitude, longitude)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
  `)

  // Tasks cache
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_tasks (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      unit_id TEXT,
      status TEXT,
      priority TEXT,
      due_date TEXT,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_tasks_org ON cached_tasks(organization_id);
    CREATE INDEX IF NOT EXISTS idx_cached_tasks_status ON cached_tasks(status);
  `)

  // Contractors cache
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_contractors (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_contractors_org ON cached_contractors(organization_id);
  `)

  // Tenants cache
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_tenants (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_tenants_org ON cached_tenants(organization_id);
  `)

  // Leases cache (for tenant info on units)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_leases (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      status TEXT,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_leases_org ON cached_leases(organization_id);
    CREATE INDEX IF NOT EXISTS idx_cached_leases_unit ON cached_leases(unit_id);
  `)

  // Photos metadata cache (actual files stored separately)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_photos (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      event_type TEXT,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cached_photos_org ON cached_photos(organization_id);
    CREATE INDEX IF NOT EXISTS idx_cached_photos_unit ON cached_photos(unit_id);
  `)

  console.log('[OfflineDB] Database initialized')
}

// Generic cache operations
export async function cacheData<T extends { id: string; updated_at?: string }>(
  tableName: string,
  organizationId: string,
  records: T[]
): Promise<void> {
  const database = await getDatabase()

  const cacheTable = `cached_${tableName}`

  for (const record of records) {
    const data = JSON.stringify(record)
    const updatedAt = record.updated_at || new Date().toISOString()

    // Handle leases specially due to extra required columns
    if (tableName === 'leases') {
      const lease = record as any
      // Skip leases without unit_id or tenant_id
      if (!lease.unit_id || !lease.tenant_id) {
        console.warn(`[OfflineDB] Skipping lease ${lease.id} - missing unit_id or tenant_id`)
        continue
      }
      await database.runAsync(
        `INSERT OR REPLACE INTO ${cacheTable} (id, organization_id, unit_id, tenant_id, status, data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [record.id, organizationId, lease.unit_id, lease.tenant_id, lease.status || null, data, updatedAt]
      )
    } else if (tableName === 'units') {
      // Handle units with latitude/longitude for offline proximity matching
      const unit = record as any
      await database.runAsync(
        `INSERT OR REPLACE INTO ${cacheTable} (id, organization_id, latitude, longitude, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [record.id, organizationId, unit.latitude || null, unit.longitude || null, data, updatedAt]
      )
    } else if (tableName === 'tasks') {
      const task = record as any
      await database.runAsync(
        `INSERT OR REPLACE INTO ${cacheTable} (id, organization_id, unit_id, status, priority, due_date, data, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, organizationId, task.unit_id || null, task.status || null, task.priority || null, task.due_date || null, data, updatedAt]
      )
    } else {
      // Use INSERT OR REPLACE for upsert behavior
      await database.runAsync(
        `INSERT OR REPLACE INTO ${cacheTable} (id, organization_id, data, updated_at) VALUES (?, ?, ?, ?)`,
        [record.id, organizationId, data, updatedAt]
      )
    }
  }

  // Update metadata
  await database.runAsync(
    `INSERT OR REPLACE INTO cache_metadata (table_name, last_synced_at, organization_id) VALUES (?, ?, ?)`,
    [tableName, new Date().toISOString(), organizationId]
  )
}

export async function getCachedData<T>(
  tableName: string,
  organizationId: string
): Promise<T[]> {
  const database = await getDatabase()
  const cacheTable = `cached_${tableName}`

  const results = await database.getAllAsync<{ data: string }>(
    `SELECT data FROM ${cacheTable} WHERE organization_id = ?`,
    [organizationId]
  )

  return results.map(row => JSON.parse(row.data) as T)
}

export async function getCachedById<T>(
  tableName: string,
  id: string
): Promise<T | null> {
  const database = await getDatabase()
  const cacheTable = `cached_${tableName}`

  const result = await database.getFirstAsync<{ data: string }>(
    `SELECT data FROM ${cacheTable} WHERE id = ?`,
    [id]
  )

  return result ? JSON.parse(result.data) as T : null
}

// Task-specific queries
export async function getCachedTasks(
  organizationId: string,
  filter?: { status?: string[]; priority?: string }
): Promise<any[]> {
  const database = await getDatabase()

  let query = `SELECT data FROM cached_tasks WHERE organization_id = ?`
  const params: any[] = [organizationId]

  if (filter?.status && filter.status.length > 0) {
    const placeholders = filter.status.map(() => '?').join(', ')
    query += ` AND status IN (${placeholders})`
    params.push(...filter.status)
  }

  if (filter?.priority) {
    query += ` AND priority = ?`
    params.push(filter.priority)
  }

  query += ` ORDER BY updated_at DESC`

  const results = await database.getAllAsync<{ data: string }>(query, params)
  return results.map(row => JSON.parse(row.data))
}

// Lease-specific queries
export async function getCachedLeaseByUnit(
  unitId: string,
  status: string = 'active'
): Promise<any | null> {
  const database = await getDatabase()

  const result = await database.getFirstAsync<{ data: string }>(
    `SELECT data FROM cached_leases WHERE unit_id = ? AND status = ? LIMIT 1`,
    [unitId, status]
  )

  return result ? JSON.parse(result.data) : null
}

// Get cached units with coordinates for offline proximity matching
export async function getCachedUnitsWithCoordinates(
  organizationId: string
): Promise<any[]> {
  const database = await getDatabase()

  const results = await database.getAllAsync<{ data: string; latitude: number | null; longitude: number | null }>(
    `SELECT data, latitude, longitude FROM cached_units WHERE organization_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL`,
    [organizationId]
  )

  return results.map(row => JSON.parse(row.data))
}

// Get last sync time for a table
export async function getLastSyncTime(tableName: string): Promise<string | null> {
  const database = await getDatabase()

  const result = await database.getFirstAsync<{ last_synced_at: string }>(
    `SELECT last_synced_at FROM cache_metadata WHERE table_name = ?`,
    [tableName]
  )

  return result?.last_synced_at || null
}

// Clear all cache for an organization (e.g., on logout)
export async function clearCache(organizationId?: string): Promise<void> {
  const database = await getDatabase()

  const tables = ['cached_units', 'cached_tasks', 'cached_contractors', 'cached_tenants', 'cached_leases', 'cached_photos']

  for (const table of tables) {
    if (organizationId) {
      await database.runAsync(`DELETE FROM ${table} WHERE organization_id = ?`, [organizationId])
    } else {
      await database.runAsync(`DELETE FROM ${table}`)
    }
  }

  if (organizationId) {
    await database.runAsync(`DELETE FROM cache_metadata WHERE organization_id = ?`, [organizationId])
  } else {
    await database.runAsync(`DELETE FROM cache_metadata`)
  }

  console.log('[OfflineDB] Cache cleared')
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync()
    db = null
  }
}
