'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { buildingCreateSchema, type BuildingCreateInput } from '@/lib/validations/building'
import { createBuildingAction, updateBuildingAction } from '@/app/(dashboard)/buildings/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import type { Tables } from '@/types/database'

interface BuildingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  building?: Tables<'buildings'> | null
  onSuccess?: () => void
}

export function BuildingForm({ open, onOpenChange, building, onSuccess }: BuildingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!building

  const form = useForm<BuildingCreateInput>({
    resolver: zodResolver(buildingCreateSchema),
    defaultValues: {
      name: building?.name || '',
      address: building?.address || '',
      notes: building?.notes || '',
    },
  })

  async function onSubmit(data: BuildingCreateInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('address', data.address)
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateBuildingAction(building.id, formData)
        : await createBuildingAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Building updated' : 'Building created')
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Something went wrong')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Building' : 'Add New Building'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this building.'
              : 'Add a new building to group multiple units together.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Building Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Sunset Apartments" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this building..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Building' : 'Add Building'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
