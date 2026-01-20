'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { contractorFullSchema, type ContractorFullInput, serviceTypeOptions, formatServiceType } from '@/lib/validations/contractor'
import { createContractorAction, updateContractorAction } from '@/app/(dashboard)/contractors/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

interface ContractorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractor?: Tables<'contractors'> | null
  onSuccess?: () => void
}

export function ContractorForm({ open, onOpenChange, contractor, onSuccess }: ContractorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    !!contractor?.address || !!contractor?.hourly_rate || !!contractor?.notes
  )
  const isEditing = !!contractor

  const form = useForm<ContractorFullInput>({
    resolver: zodResolver(contractorFullSchema),
    defaultValues: {
      name: contractor?.name || '',
      email: contractor?.email || '',
      phone: contractor?.phone || '',
      address: contractor?.address || '',
      service_types: contractor?.service_types || [],
      hourly_rate: contractor?.hourly_rate ?? undefined,
      notes: contractor?.notes || '',
    },
  })

  async function onSubmit(data: ContractorFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('name', data.name)
    if (data.email) formData.set('email', data.email)
    if (data.phone) formData.set('phone', data.phone)
    if (data.address) formData.set('address', data.address)
    if (data.service_types && data.service_types.length > 0) {
      formData.set('service_types', JSON.stringify(data.service_types))
    }
    if (data.hourly_rate !== undefined && data.hourly_rate !== null) {
      formData.set('hourly_rate', String(data.hourly_rate))
    }
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateContractorAction(contractor.id, formData)
        : await createContractorAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Contractor updated' : 'Contractor created')
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contractor' : 'Add New Contractor'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this contractor.'
              : 'Add a new contractor or vendor to your network.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Plumbing Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@example.com"
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
            </div>

            {/* Service Types */}
            <FormField
              control={form.control}
              name="service_types"
              render={() => (
                <FormItem>
                  <FormLabel>Service Types</FormLabel>
                  <FormDescription>
                    Select the types of services this contractor provides.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {serviceTypeOptions.map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name="service_types"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={type}
                              className="flex flex-row items-center space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || []
                                    if (checked) {
                                      field.onChange([...current, type])
                                    } else {
                                      field.onChange(current.filter((v) => v !== type))
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {formatServiceType(type)}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Details Section */}
            <Collapsible open={showAdditionalDetails} onOpenChange={setShowAdditionalDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Additional Details</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, City, State 12345"
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
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="75.00"
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this contractor..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Contractor' : 'Add Contractor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
