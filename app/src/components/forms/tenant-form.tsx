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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { tenantFullSchema, type TenantFullInput } from '@/lib/validations/tenant'
import { createTenantAction, updateTenantAction } from '@/app/(dashboard)/tenants/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

interface TenantFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant?: Tables<'tenants'> | null
  onSuccess?: () => void
}

export function TenantForm({ open, onOpenChange, tenant, onSuccess }: TenantFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmergencyContact, setShowEmergencyContact] = useState(
    !!tenant?.emergency_contact_name || !!tenant?.emergency_contact_phone
  )
  const isEditing = !!tenant

  const form = useForm<TenantFullInput>({
    resolver: zodResolver(tenantFullSchema),
    defaultValues: {
      first_name: tenant?.first_name || '',
      last_name: tenant?.last_name || '',
      email: tenant?.email || '',
      phone: tenant?.phone || '',
      emergency_contact_name: tenant?.emergency_contact_name || '',
      emergency_contact_phone: tenant?.emergency_contact_phone || '',
      emergency_contact_relationship: tenant?.emergency_contact_relationship || '',
      notes: tenant?.notes || '',
    },
  })

  async function onSubmit(data: TenantFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('first_name', data.first_name)
    formData.set('last_name', data.last_name)
    if (data.email) formData.set('email', data.email)
    if (data.phone) formData.set('phone', data.phone)
    if (data.emergency_contact_name) formData.set('emergency_contact_name', data.emergency_contact_name)
    if (data.emergency_contact_phone) formData.set('emergency_contact_phone', data.emergency_contact_phone)
    if (data.emergency_contact_relationship) formData.set('emergency_contact_relationship', data.emergency_contact_relationship)
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateTenantAction(tenant.id, formData)
        : await createTenantAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Tenant updated' : 'Tenant created')
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
          <DialogTitle>{isEditing ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this tenant.'
              : 'Add a new tenant to your portfolio. You can link them to a lease after creating.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Emergency Contact Section */}
            <Collapsible open={showEmergencyContact} onOpenChange={setShowEmergencyContact}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Emergency Contact</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showEmergencyContact ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
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
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 987-6543"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_contact_relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Parent, Spouse, etc."
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this tenant..."
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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Tenant' : 'Add Tenant'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
