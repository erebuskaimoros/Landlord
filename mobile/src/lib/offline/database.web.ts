// Web stub - SQLite is not supported on web
// All functions return no-op/empty values

export async function getDatabase(): Promise<null> {
  console.log('[OfflineDB] SQLite not supported on web')
  return null
}

export async function cacheData<T extends { id: string; updated_at?: string }>(
  _tableName: string,
  _organizationId: string,
  _records: T[]
): Promise<void> {
  // No-op on web
}

export async function getCachedData<T>(
  _tableName: string,
  _organizationId: string
): Promise<T[]> {
  return []
}

export async function getCachedById<T>(
  _tableName: string,
  _id: string
): Promise<T | null> {
  return null
}

export async function getCachedTasks(
  _organizationId: string,
  _filter?: { status?: string[]; priority?: string }
): Promise<any[]> {
  return []
}

export async function getCachedLeaseByUnit(
  _unitId: string,
  _status: string = 'active'
): Promise<any | null> {
  return null
}

export async function getLastSyncTime(_tableName: string): Promise<string | null> {
  return null
}

export async function clearCache(_organizationId?: string): Promise<void> {
  // No-op on web
}

export async function closeDatabase(): Promise<void> {
  // No-op on web
}
