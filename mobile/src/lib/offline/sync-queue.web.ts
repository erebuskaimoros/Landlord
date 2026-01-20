// Web stub - Sync queue is not supported on web (requires SQLite)

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE'
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed'

export interface SyncQueueItem {
  id: string
  operation: SyncOperation
  table_name: string
  record_id: string
  data: Record<string, unknown>
  timestamp: number
  status: SyncStatus
  retry_count: number
  error_message?: string
}

export async function addToSyncQueue(
  _operation: SyncOperation,
  _tableName: string,
  _recordId: string,
  _data: Record<string, unknown>
): Promise<string> {
  return ''
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  return []
}

export async function getPendingSyncCount(): Promise<number> {
  return 0
}

export async function updateSyncStatus(
  _id: string,
  _status: SyncStatus,
  _errorMessage?: string
): Promise<void> {
  // No-op on web
}

export async function processSync(): Promise<{ success: number; failed: number }> {
  return { success: 0, failed: 0 }
}

export async function clearSyncQueue(): Promise<void> {
  // No-op on web
}
