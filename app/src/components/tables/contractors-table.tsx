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
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, Mail, Phone, Star } from 'lucide-react'
import type { Tables } from '@/types/database'
import { deleteContractorAction } from '@/app/(dashboard)/contractors/actions'
import { toast } from 'sonner'
import { ContractorForm } from '@/components/forms/contractor-form'
import { useUserRole } from '@/hooks/useUserRole'
import { formatServiceType } from '@/lib/validations/contractor'

interface ContractorsTableProps {
  contractors: Tables<'contractors'>[]
}

function formatRating(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : '-'
}

export function ContractorsTable({ contractors }: ContractorsTableProps) {
  const [editingContractor, setEditingContractor] = useState<Tables<'contractors'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { canEdit, canDelete } = useUserRole()

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteContractorAction(id)
      if (result.success) {
        toast.success('Contractor deleted')
      } else {
        toast.error(result.error || 'Failed to delete contractor')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (contractors.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((contractor) => (
              <TableRow key={contractor.id}>
                <TableCell className="font-medium">{contractor.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contractor.service_types && contractor.service_types.length > 0 ? (
                      contractor.service_types.slice(0, 3).map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {formatServiceType(type)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No services</span>
                    )}
                    {contractor.service_types && contractor.service_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contractor.service_types.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {contractor.email && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        {contractor.email}
                      </div>
                    )}
                    {contractor.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {contractor.phone}
                      </div>
                    )}
                    {!contractor.email && !contractor.phone && (
                      <span className="text-sm text-gray-400">No contact info</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className={`h-4 w-4 ${contractor.average_rating > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    <span className="text-sm">{formatRating(contractor.average_rating)}</span>
                    {contractor.total_jobs > 0 && (
                      <span className="text-xs text-gray-500">({contractor.total_jobs} jobs)</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === contractor.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/contractors/${contractor.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingContractor(contractor)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(contractor.id)}
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
        <ContractorForm
          open={!!editingContractor}
          onOpenChange={(open) => !open && setEditingContractor(null)}
          contractor={editingContractor}
        />
      )}
    </>
  )
}
