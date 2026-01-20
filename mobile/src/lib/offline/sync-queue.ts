import { getDatabase } from './database'
import { supabase } from '../supabase/client'

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

const MAX_RETRIES = 3

// Generate a UUID for sync queue items
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Add an item to the sync queue
export async function addToSyncQueue(
  operation: SyncOperation,
  tableName: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<string> {
  const database = await getDatabase()

  const id = generateId()
  const timestamp = Date.now()

  await database.runAsync(
    `INSERT INTO sync_queue (id, operation, table_name, record_id, data, timestamp, status, retry_count)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
    [id, operation, tableName, recordId, JSON.stringify(data), timestamp]
  )

  console.log(`[SyncQueue] Added ${operation} for ${tableName}/${recordId}`)
  return id
}

// Get all pending items from the sync queue
export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const database = await getDatabase()

  const results = await database.getAllAsync<{
    id: string
    operation: SyncOperation
    table_name: string
    record_id: string
    data: string
    timestamp: number
    status: SyncStatus
    retry_count: number
    error_message: string | null
  }>(`
    SELECT * FROM sync_queue
    WHERE status IN ('pending', 'failed') AND retry_count < ?
    ORDER BY timestamp ASC
  `, [MAX_RETRIES])

  return results.map(row => ({
    id: row.id,
    operation: row.operation,
    table_name: row.table_name,
    record_id: row.record_id,
    data: JSON.parse(row.data),
    timestamp: row.timestamp,
    status: row.status,
    retry_count: row.retry_count,
    error_message: row.error_message || undefined,
  }))
}

// Get count of pending sync items
export async function getPendingSyncCount(): Promise<number> {
  const database = await getDatabase()

  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed') AND retry_count < ?`,
    [MAX_RETRIES]
  )

  return result?.count || 0
}

// Update sync queue item status
export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  errorMessage?: string
): Promise<void> {
  const database = await getDatabase()

  if (status === 'failed') {
    await database.runAsync(
      `UPDATE sync_queue SET status = ?, error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [status, errorMessage || null, id]
    )
  } else {
    await database.runAsync(
      `UPDATE sync_queue SET status = ?, error_message = NULL WHERE id = ?`,
      [status, id]
    )
  }
}

// Remove completed items from queue
export async function removeCompletedItems(): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(`DELETE FROM sync_queue WHERE status = 'completed'`)
}

// Clear all failed items that exceeded max retries
export async function clearFailedItems(): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(`DELETE FROM sync_queue WHERE retry_count >= ?`, [MAX_RETRIES])
}

// Process a single sync queue item
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    await updateSyncStatus(item.id, 'syncing')

    switch (item.operation) {
      case 'INSERT': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = supabase.from(item.table_name as 'tasks')
        const { error } = await (table as any).insert(item.data)

        if (error) throw error
        break
      }

      case 'UPDATE': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = supabase.from(item.table_name as 'tasks')
        const { error } = await (table as any).update(item.data).eq('id', item.record_id)

        if (error) throw error
        break
      }

      case 'DELETE': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = supabase.from(item.table_name as 'tasks')
        const { error } = await (table as any).delete().eq('id', item.record_id)

        if (error) throw error
        break
      }
    }

    await updateSyncStatus(item.id, 'completed')
    console.log(`[SyncQueue] Synced ${item.operation} for ${item.table_name}/${item.record_id}`)
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await updateSyncStatus(item.id, 'failed', errorMessage)
    console.error(`[SyncQueue] Failed to sync ${item.table_name}/${item.record_id}:`, errorMessage)
    return false
  }
}

// Process all pending sync items
export async function processSync(): Promise<{ success: number; failed: number }> {
  const pendingItems = await getPendingItems()

  if (pendingItems.length === 0) {
    console.log('[SyncQueue] No pending items to sync')
    return { success: 0, failed: 0 }
  }

  console.log(`[SyncQueue] Processing ${pendingItems.length} pending items`)

  let success = 0
  let failed = 0

  for (const item of pendingItems) {
    const result = await processSyncItem(item)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  // Clean up completed items
  await removeCompletedItems()

  console.log(`[SyncQueue] Sync complete: ${success} success, ${failed} failed`)
  return { success, failed }
}

// Clear entire sync queue (e.g., on logout)
export async function clearSyncQueue(): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(`DELETE FROM sync_queue`)
  console.log('[SyncQueue] Queue cleared')
}
