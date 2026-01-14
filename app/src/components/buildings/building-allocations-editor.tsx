'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

interface BuildingAllocationsEditorProps {
  buildingId: string
  units: Tables<'units'>[]
  initialAllocations: Map<string, number>
  onSave: (allocations: { unit_id: string; allocation_percentage: number }[]) => Promise<{ success: boolean; error?: string }>
}

export function BuildingAllocationsEditor({
  buildingId,
  units,
  initialAllocations,
  onSave,
}: BuildingAllocationsEditorProps) {
  // Initialize allocations from initial values
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const unit of units) {
      const percentage = initialAllocations.get(unit.id)
      initial[unit.id] = percentage !== undefined ? percentage.toString() : ''
    }
    return initial
  })
  const [isSaving, setIsSaving] = useState(false)

  // Calculate total
  const total = Object.values(allocations).reduce((sum, val) => {
    const num = parseFloat(val)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)

  const isValid = Math.abs(total - 100) < 0.01 || total === 0
  const hasAllocations = Object.values(allocations).some((v) => v !== '' && parseFloat(v) > 0)

  const handleChange = (unitId: string, value: string) => {
    // Allow empty string, or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAllocations((prev) => ({ ...prev, [unitId]: value }))
    }
  }

  const handleSplitEvenly = () => {
    if (units.length === 0) return
    const evenSplit = (100 / units.length).toFixed(2)
    const newAllocations: Record<string, string> = {}
    for (const unit of units) {
      newAllocations[unit.id] = evenSplit
    }
    // Adjust last one to ensure exactly 100%
    const remaining = 100 - parseFloat(evenSplit) * (units.length - 1)
    if (units.length > 0) {
      newAllocations[units[units.length - 1].id] = remaining.toFixed(2)
    }
    setAllocations(newAllocations)
  }

  const handleClear = () => {
    const cleared: Record<string, string> = {}
    for (const unit of units) {
      cleared[unit.id] = ''
    }
    setAllocations(cleared)
  }

  const handleSave = async () => {
    if (!isValid && hasAllocations) {
      toast.error('Allocations must sum to 100%')
      return
    }

    setIsSaving(true)
    try {
      // Convert to array format, filtering out empty values
      const allocationsArray = Object.entries(allocations)
        .filter(([, val]) => val !== '' && parseFloat(val) > 0)
        .map(([unitId, val]) => ({
          unit_id: unitId,
          allocation_percentage: parseFloat(val),
        }))

      const result = await onSave(allocationsArray)
      if (result.success) {
        toast.success('Allocations saved')
      } else {
        toast.error(result.error || 'Failed to save allocations')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  if (units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Expense Allocations
          </CardTitle>
          <CardDescription>
            Set how shared expenses are split across units in this building.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            Add units to this building to configure expense allocations.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Expense Allocations
        </CardTitle>
        <CardDescription>
          Set how shared expenses are split across units in this building.
          Percentages must sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Allocation inputs */}
        <div className="space-y-3">
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {unit.address}
                  {unit.unit_number && ` #${unit.unit_number}`}
                </p>
                {unit.city && (
                  <p className="text-sm text-gray-500">{unit.city}, {unit.state}</p>
                )}
              </div>
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={allocations[unit.id] || ''}
                  onChange={(e) => handleChange(unit.id, e.target.value)}
                  placeholder="0"
                  className="text-right"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total and validation */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {hasAllocations ? (
              isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    Total: {total.toFixed(2)}%
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">
                    Total: {total.toFixed(2)}% (must be 100%)
                  </span>
                </>
              )
            ) : (
              <span className="text-sm text-gray-500">No allocations set</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSplitEvenly}>
              Split Evenly
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || (!isValid && hasAllocations)}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
