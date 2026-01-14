import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks that are available to vi.mock
const { mockQueryBuilder, mockSupabase } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn((resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)),
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }

  return { mockQueryBuilder, mockSupabase }
})

// Mock the module using factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Import after mocking
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionCategories,
  getTransactionTotals
} from '../transactions'

// Helper to set mock response
function setMockResponse(data: unknown, error?: { message: string; code?: string } | null) {
  const response = { data, error: error ?? null, count: Array.isArray(data) ? data.length : null }

  // Update the thenable behavior
  mockQueryBuilder.then = vi.fn((resolve: (value: unknown) => void) =>
    Promise.resolve(response).then(resolve))

  mockQueryBuilder.single.mockResolvedValue(response)
}

describe('Transactions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset query builder chain methods
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.or.mockReturnThis()
    mockQueryBuilder.gte.mockReturnThis()
    mockQueryBuilder.lte.mockReturnThis()
    mockQueryBuilder.ilike.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.range.mockReturnThis()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
  })

  describe('getTransactions', () => {
    it('fetches transactions for an organization', async () => {
      const mockTransactions = [
        { id: '1', type: 'income', actual_amount: 1500, description: 'Rent', organization_id: 'org-1' },
        { id: '2', type: 'expense', actual_amount: 200, description: 'Repair', organization_id: 'org-1' },
      ]
      setMockResponse(mockTransactions)

      const result = await getTransactions({ organizationId: 'org-1' })

      expect(result.transactions).toEqual(mockTransactions)
      expect(result.count).toBe(2)
    })

    it('applies type filter when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', type: 'income' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('type', 'income')
    })

    it('applies category filter when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', categoryId: 'cat-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })

    it('applies unit filter when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', unitId: 'unit-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
    })

    it('applies tenant filter when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', tenantId: 'tenant-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    })

    it('applies date range filters when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', startDate: '2024-01-01', endDate: '2024-12-31' })

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('transaction_date', '2024-12-31')
    })

    it('applies search filter when provided', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', search: 'Rent' })

      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('description', '%Rent%')
    })

    it('applies pagination with default values', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1' })

      // Default: limit=50, offset=0, so range should be 0 to 49
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49)
    })

    it('applies custom pagination', async () => {
      setMockResponse([])

      await getTransactions({ organizationId: 'org-1', limit: 10, offset: 20 })

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getTransactions({ organizationId: 'org-1' })).rejects.toThrow('Failed to fetch transactions')
    })

    it('returns empty array when no data', async () => {
      setMockResponse(null)

      const result = await getTransactions({ organizationId: 'org-1' })

      expect(result.transactions).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('getTransaction', () => {
    it('fetches a single transaction by ID with relations', async () => {
      const mockTransaction = {
        id: '1',
        type: 'income',
        actual_amount: 1500,
        category: { name: 'Rent' },
        tenant: { first_name: 'John' },
        unit: { address: '123 Main' }
      }
      setMockResponse(mockTransaction)

      const result = await getTransaction('1')

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockTransaction)
    })

    it('returns null when transaction not found (PGRST116)', async () => {
      setMockResponse(null, { code: 'PGRST116', message: 'Not found' })

      const result = await getTransaction('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for other database errors', async () => {
      setMockResponse(null, { message: 'Connection failed' })

      await expect(getTransaction('1')).rejects.toThrow('Failed to fetch transaction')
    })
  })

  describe('createTransaction', () => {
    it('creates a new transaction', async () => {
      const newTransaction = {
        type: 'income' as const,
        actual_amount: 1500,
        transaction_date: '2024-01-01',
        description: 'Rent payment',
        organization_id: 'org-1'
      }
      const createdTransaction = { id: '3', ...newTransaction }
      setMockResponse(createdTransaction)

      const result = await createTransaction(newTransaction)

      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(mockQueryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(createdTransaction)
    })

    it('throws error when creation fails', async () => {
      setMockResponse(null, { message: 'Validation error' })

      await expect(createTransaction({ organization_id: 'org-1' } as never)).rejects.toThrow('Failed to create transaction')
    })
  })

  describe('updateTransaction', () => {
    it('updates an existing transaction', async () => {
      const updates = { actual_amount: 2000 }
      const updatedTransaction = { id: '1', type: 'income', actual_amount: 2000 }
      setMockResponse(updatedTransaction)

      const result = await updateTransaction('1', updates)

      expect(mockQueryBuilder.update).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedTransaction)
    })

    it('throws error when update fails', async () => {
      setMockResponse(null, { message: 'Not found' })

      await expect(updateTransaction('1', {})).rejects.toThrow('Failed to update transaction')
    })
  })

  describe('deleteTransaction', () => {
    it('deletes a transaction', async () => {
      setMockResponse(null)

      await expect(deleteTransaction('1')).resolves.not.toThrow()

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      setMockResponse(null, { message: 'Foreign key constraint' })

      await expect(deleteTransaction('1')).rejects.toThrow('Failed to delete transaction')
    })
  })

  describe('getTransactionCategories', () => {
    it('fetches categories for organization including system defaults', async () => {
      const mockCategories = [
        { id: '1', name: 'Rent', type: 'income', is_system_default: true },
        { id: '2', name: 'Custom', type: 'expense', organization_id: 'org-1' },
      ]
      setMockResponse(mockCategories)

      const result = await getTransactionCategories('org-1')

      expect(mockQueryBuilder.or).toHaveBeenCalled()
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('type')
      expect(result).toEqual(mockCategories)
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getTransactionCategories('org-1')).rejects.toThrow('Failed to fetch categories')
    })
  })

  describe('getTransactionTotals', () => {
    it('calculates income, expense, and net totals', async () => {
      const mockTransactions = [
        { type: 'income', actual_amount: 1500 },
        { type: 'income', actual_amount: 2000 },
        { type: 'expense', actual_amount: 500 },
        { type: 'expense', actual_amount: 300 },
      ]
      setMockResponse(mockTransactions)

      const result = await getTransactionTotals('org-1')

      expect(result).toEqual({
        income: 3500,
        expense: 800,
        net: 2700,
      })
    })

    it('returns zero totals when no transactions', async () => {
      setMockResponse([])

      const result = await getTransactionTotals('org-1')

      expect(result).toEqual({
        income: 0,
        expense: 0,
        net: 0,
      })
    })

    it('throws error when fetch fails', async () => {
      setMockResponse(null, { message: 'Database error' })

      await expect(getTransactionTotals('org-1')).rejects.toThrow('Failed to fetch transaction totals')
    })
  })
})
