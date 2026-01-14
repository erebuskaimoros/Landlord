'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteUnitAction } from '@/app/(dashboard)/units/actions'
import { toast } from 'sonner'
import { UnitForm } from '@/components/forms/unit-form'
import { useUserRole } from '@/hooks/useUserRole'

interface UnitsTableProps {
  units: Tables<'units'>[]
  buildings?: Tables<'buildings'>[]
}

function StatusBadge({ status }: { status: Tables<'units'>['status'] }) {
  const variants: Record<Tables<'units'>['status'], 'default' | 'secondary' | 'outline'> = {
    occupied: 'default',
    vacant: 'secondary',
    sold: 'outline',
  }

  const labels: Record<Tables<'units'>['status'], string> = {
    occupied: 'Occupied',
    vacant: 'Vacant',
    sold: 'Sold',
  }

  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

function formatAddress(unit: Tables<'units'>) {
  const parts = [unit.address]
  if (unit.unit_number) {
    parts[0] = `${unit.address}, ${unit.unit_number}`
  }
  if (unit.city || unit.state || unit.zip_code) {
    const location = [unit.city, unit.state, unit.zip_code].filter(Boolean).join(', ')
    return (
      <>
        <div className="font-medium">{parts[0]}</div>
        <div className="text-sm text-gray-500">{location}</div>
      </>
    )
  }
  return <div className="font-medium">{parts[0]}</div>
}

export function UnitsTable({ units, buildings = [] }: UnitsTableProps) {
  const [editingUnit, setEditingUnit] = useState<Tables<'units'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this unit? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteUnitAction(id)
      if (result.success) {
        toast.success('Unit deleted')
      } else {
        toast.error(result.error || 'Failed to delete unit')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (units.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              {buildings.length > 0 && <TableHead>Building</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => {
              const building = buildings.find((b) => b.id === unit.building_id)
              return (
              <TableRow key={unit.id}>
                <TableCell>{formatAddress(unit)}</TableCell>
                {buildings.length > 0 && (
                  <TableCell>
                    {building ? (
                      <Link
                        href={`/buildings/${building.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {building.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={unit.status} />
                </TableCell>
                <TableCell>
                  {unit.rental_price
                    ? `$${unit.rental_price.toLocaleString()}/mo`
                    : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === unit.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/units/${unit.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingUnit(unit)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(unit.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <UnitForm
          open={!!editingUnit}
          onOpenChange={(open) => !open && setEditingUnit(null)}
          unit={editingUnit}
          buildings={buildings}
        />
      )}
    </>
  )
}
