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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  maintenanceLogCreateSchema,
  type MaintenanceLogCreateInput,
  serviceTypeOptions,
  formatServiceType,
} from '@/lib/validations/asset-maintenance-log'
import { createMaintenanceLogAction, updateMaintenanceLogAction } from '@/app/(dashboard)/assets/[id]/maintenance-actions'
import { toast } from 'sonner'
import { useState } from 'react'
import type { Tables } from '@/types/database'

interface MaintenanceLogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  log?: Tables<'asset_maintenance_logs'> | null
  contractors: Tables<'contractors'>[]
  onSuccess?: () => void
}

export function MaintenanceLogForm({
  open,
  onOpenChange,
  assetId,
  log,
  contractors,
  onSuccess,
}: MaintenanceLogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!log

  const form = useForm<MaintenanceLogCreateInput>({
    resolver: zodResolver(maintenanceLogCreateSchema),
    defaultValues: {
      asset_id: assetId,
      service_date: log?.service_date || new Date().toISOString().split('T')[0],
      service_type: log?.service_type || '',
      description: log?.description || '',
      cost: log?.cost ?? undefined,
      performed_by: log?.performed_by || '',
      contractor_id: log?.contractor_id || '',
      notes: log?.notes || '',
    },
  })

  async function onSubmit(data: MaintenanceLogCreateInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('asset_id', data.asset_id)
    formData.set('service_date', data.service_date)
    formData.set('service_type', data.service_type)
    if (data.description) formData.set('description', data.description)
    if (data.cost !== undefined && data.cost !== null) {
      formData.set('cost', String(data.cost))
    }
    if (data.performed_by) formData.set('performed_by', data.performed_by)
    if (data.contractor_id) formData.set('contractor_id', data.contractor_id)
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateMaintenanceLogAction(log.id, assetId, formData)
        : await createMaintenanceLogAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Maintenance log updated' : 'Maintenance log added')
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Maintenance Log' : 'Add Maintenance Log'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this maintenance record.'
              : 'Record a service event for this asset.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatServiceType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What was done..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : parseFloat(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="performed_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performed By</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name or company"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {contractors.length > 0 && (
              <FormField
                control={form.control}
                name="contractor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contractor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractors.map((contractor) => (
                          <SelectItem key={contractor.id} value={contractor.id}>
                            {contractor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add Log'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
