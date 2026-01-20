'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Split, Trash2 } from 'lucide-react'
import { calculateEqualSplit, type AllocationInput } from '@/services/transaction-allocations-shared'
import type { Tables } from '@/types/database'

interface TransactionAllocationsEditorProps {
  units: Tables<'units'>[]
  totalAmount: number
  initialAllocations?: AllocationInput[]
  onChange: (allocations: AllocationInput[]) => void
  disabled?: boolean
}

export function TransactionAllocationsEditor({
  units,
  totalAmount,
  initialAllocations = [],
  onChange,
  disabled = false,
}: TransactionAllocationsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(initialAllocations.length > 0)
  const [allocations, setAllocations] = useState<AllocationInput[]>(initialAllocations)
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set(initialAllocations.map((a) => a.unit_id))
  )
  const [splitEqually, setSplitEqually] = useState(true)

  // Update allocations when props change
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations)
      setSelectedUnitIds(new Set(initialAllocations.map((a) => a.unit_id)))
      setIsExpanded(true)
    }
  }, [initialAllocations])

  // Calculate totals
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0)
  const remainingAmount = totalAmount - allocatedTotal
  const isBalanced = Math.abs(remainingAmount) <= 0.01

  function handleToggleUnit(unitId: string, checked: boolean) {
    const newSelectedIds = new Set(selectedUnitIds)

    if (checked) {
      newSelectedIds.add(unitId)
    } else {
      newSelectedIds.delete(unitId)
    }

    setSelectedUnitIds(newSelectedIds)

    if (splitEqually) {
      const newAllocations = calculateEqualSplit(Array.from(newSelectedIds), totalAmount)
      setAllocations(newAllocations)
      onChange(newAllocations)
    } else {
      // Keep existing amounts for selected units, add 0 for new ones
      const newAllocations: AllocationInput[] = []
      for (const id of newSelectedIds) {
        const existing = allocations.find((a) => a.unit_id === id)
        if (existing) {
          newAllocations.push(existing)
        } else {
          newAllocations.push({ unit_id: id, amount: 0 })
        }
      }
      setAllocations(newAllocations)
      onChange(newAllocations)
    }
  }

  function handleAmountChange(unitId: string, amount: number) {
    const newAllocations = allocations.map((a) =>
      a.unit_id === unitId ? { ...a, amount } : a
    )
    setAllocations(newAllocations)
    onChange(newAllocations)
  }

  function handleSplitEqually() {
    const newAllocations = calculateEqualSplit(Array.from(selectedUnitIds), totalAmount)
    setAllocations(newAllocations)
    setSplitEqually(true)
    onChange(newAllocations)
  }

  function handleClearAll() {
    setAllocations([])
    setSelectedUnitIds(new Set())
    setSplitEqually(true)
    onChange([])
  }

  function getUnitLabel(unit: Tables<'units'>) {
    return unit.unit_number
      ? `${unit.address} #${unit.unit_number}`
      : unit.address
  }

  if (units.length === 0) {
    return null
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Split className="h-4 w-4" />
            Split Across Units
            {allocations.length > 0 && (
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {allocations.length} unit{allocations.length !== 1 ? 's' : ''}
              </span>
            )}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSplitEqually}
              disabled={disabled || selectedUnitIds.size === 0}
            >
              Split Equally
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled || allocations.length === 0}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Unit selection */}
          <div className="space-y-2">
            {units.map((unit) => {
              const isSelected = selectedUnitIds.has(unit.id)
              const allocation = allocations.find((a) => a.unit_id === unit.id)

              return (
                <div
                  key={unit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <Checkbox
                    id={`unit-${unit.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggleUnit(unit.id, checked as boolean)
                    }
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`unit-${unit.id}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {getUnitLabel(unit)}
                  </label>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocation?.amount ?? 0}
                        onChange={(e) => {
                          setSplitEqually(false)
                          handleAmountChange(unit.id, parseFloat(e.target.value) || 0)
                        }}
                        className="w-24 h-8 text-right"
                        disabled={disabled}
                      />
                      {allocation?.percentage && (
                        <span className="text-xs text-gray-500 w-12">
                          ({allocation.percentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {allocations.length > 0 && (
            <div className="flex justify-between items-center text-sm pt-2 border-t">
              <span className="text-gray-500">
                Allocated: ${allocatedTotal.toFixed(2)} of ${totalAmount.toFixed(2)}
              </span>
              <span
                className={`font-medium ${
                  isBalanced
                    ? 'text-green-600'
                    : remainingAmount > 0
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {isBalanced
                  ? 'Balanced'
                  : remainingAmount > 0
                  ? `$${remainingAmount.toFixed(2)} remaining`
                  : `$${Math.abs(remainingAmount).toFixed(2)} over`}
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
