import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks that are available to vi.mock
const { mockQueryBuilder, mockSupabase, mockAuth } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn((resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)),
  }

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    auth: mockAuth,
  }

  return { mockQueryBuilder, mockSupabase, mockAuth }
})

// Mock the module using factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Import after mocking
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getTaskCounts,
} from '../tasks'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.in.mockReturnThis()
    mockQueryBuilder.lt.mockReturnThis()
    mockQueryBuilder.or.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getTasks', () => {
    it('fetches tasks for an organization with relations', async () => {
      const mockTasks = [
        { id: '1', title: 'Fix leak', status: 'open', unit: { id: 'u1' }, contractor: null },
        { id: '2', title: 'Paint walls', status: 'in_progress', unit: { id: 'u2' }, contractor: { id: 'c1' } },
      ]
      setMockResponse(mockTasks)

      const result = await getTasks({ organizationId: 'org-1' })

      expect(result.tasks).toEqual(mockTasks)
      expect(result.count).toBe(2)
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        '*, unit:units(*), contractor:contractors(*)',
        { count: 'exact' }
      )
    })

    it('applies unit filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', unitId: 'unit-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
    })

    it('applies contractor filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', contractorId: 'contractor-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('assigned_contractor_id', 'contractor-1')
    })

    it('applies status filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', status: 'open' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'open')
    })

    it('applies priority filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', priority: 'urgent' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('priority', 'urgent')
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', search: 'leak' })

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('leak')
      )
    })

    it('applies overdue filter when provided', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1', overdue: true })

      expect(mockQueryBuilder.lt).toHaveBeenCalled()
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['open', 'in_progress'])
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getTasks({ organizationId: 'org-1' })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getTasks({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch tasks')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getTasks({ organizationId: 'org-1' })

      expect(result.tasks).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getTask', () => {
    it('fetches a single task by ID with relations', async () => {
      const mockTask = { id: '1', title: 'Fix leak', unit: { id: 'u1' }, contractor: null }
      setMockResponse(mockTask)

      const result = await getTask('1')

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, unit:units(*), contractor:contractors(*)')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockTask)
    })

    it('returns null when task not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getTask('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getTask('1')).rejects.toThrow('Failed to fetch task')
    })
  })

  describe('createTask', () => {
    it('creates a new task', async () => {
      const newTask = { title: 'New Task', unit_id: 'unit-1', organization_id: 'org-1' }
      const createdTask = { id: '3', ...newTask, status: 'open', priority: 'medium' }
      setMockResponse(createdTask)

      const result = await createTask(newTask)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(result).toEqual(createdTask)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createTask({ title: '', unit_id: 'unit-1', organization_id: 'org-1' })).rejects.toThrow('Failed to create task')
    })
  })

  describe('updateTask', () => {
    it('updates an existing task', async () => {
      const updates = { status: 'in_progress' as const }
      const updatedTask = { id: '1', title: 'Fix leak', status: 'in_progress' }
      setMockResponse(updatedTask)

      const result = await updateTask('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedTask)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateTask('1', {})).rejects.toThrow('Failed to update task')
    })
  })

  describe('deleteTask', () => {
    it('deletes a task', async () => {
      setMockResponse(null)

      await expect(deleteTask('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteTask('1')).rejects.toThrow('Failed to delete task')
    })
  })

  describe('completeTask', () => {
    it('marks task as completed with timestamp and user', async () => {
      const completedTask = {
        id: '1',
        title: 'Fix leak',
        status: 'completed',
        completed_at: expect.any(String),
        completed_by: 'user-1',
      }
      setMockResponse(completedTask)

      const result = await completeTask('1')

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(result.status).toBe('completed')
    })

    it('includes actual cost when provided', async () => {
      const completedTask = {
        id: '1',
        status: 'completed',
        actual_cost: 250,
      }
      setMockResponse(completedTask)

      const result = await completeTask('1', 250)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(result.actual_cost).toBe(250)
    })

    it('throws error when completion fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(completeTask('1')).rejects.toThrow('Failed to complete task')
    })
  })

  describe('getTaskCounts', () => {
    it('returns counts by status', async () => {
      // Mock all four parallel queries
      const mockResults = [
        { count: 5 }, // open
        { count: 3 }, // in_progress
        { count: 10 }, // completed
        { count: 2 }, // overdue
      ]

      let callIndex = 0
      mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) => {
        const result = mockResults[Math.floor(callIndex / 6)] || { count: 0 }
        callIndex++
        return Promise.resolve({ data: null, error: null, count: result.count }).then(resolve)
      })

      const result = await getTaskCounts('org-1')

      expect(result).toHaveProperty('open')
      expect(result).toHaveProperty('in_progress')
      expect(result).toHaveProperty('completed')
      expect(result).toHaveProperty('overdue')
    })
  })
})
