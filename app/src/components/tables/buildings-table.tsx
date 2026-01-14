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
import { deleteBuildingAction } from '@/app/(dashboard)/buildings/actions'
import { toast } from 'sonner'
import { BuildingForm } from '@/components/forms/building-form'
import { useUserRole } from '@/hooks/useUserRole'

interface BuildingsTableProps {
  buildings: Tables<'buildings'>[]
}

export function BuildingsTable({ buildings }: BuildingsTableProps) {
  const [editingBuilding, setEditingBuilding] = useState<Tables<'buildings'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this building? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteBuildingAction(id)
      if (result.success) {
        toast.success('Building deleted')
      } else {
        toast.error(result.error || 'Failed to delete building')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (buildings.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildings.map((building) => (
              <TableRow key={building.id}>
                <TableCell className="font-medium">{building.name}</TableCell>
                <TableCell className="text-gray-600">{building.address}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === building.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/buildings/${building.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingBuilding(building)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(building.id)}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <BuildingForm
          open={!!editingBuilding}
          onOpenChange={(open) => !open && setEditingBuilding(null)}
          building={editingBuilding}
        />
      )}
    </>
  )
}
