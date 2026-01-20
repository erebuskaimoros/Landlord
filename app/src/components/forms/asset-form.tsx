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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  assetFullSchema,
  type AssetFullInput,
  assetTypeOptions,
  assetConditionOptions,
  formatAssetType,
  formatCondition,
} from '@/lib/validations/asset'
import { createAssetAction, updateAssetAction } from '@/app/(dashboard)/assets/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

interface AssetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset?: Tables<'assets'> | null
  units: Tables<'units'>[]
  defaultUnitId?: string
  defaultAssetType?: string
  defaultName?: string
  onSuccess?: () => void
}

export function AssetForm({
  open,
  onOpenChange,
  asset,
  units,
  defaultUnitId,
  defaultAssetType,
  defaultName,
  onSuccess
}: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(
    !!asset?.make || !!asset?.model || !!asset?.serial_number || !!asset?.purchase_date || !!asset?.notes
  )
  const isEditing = !!asset

  const form = useForm<AssetFullInput>({
    resolver: zodResolver(assetFullSchema),
    defaultValues: {
      name: asset?.name || defaultName || '',
      asset_type: asset?.asset_type || defaultAssetType || '',
      unit_id: asset?.unit_id || defaultUnitId || '',
      make: asset?.make || '',
      model: asset?.model || '',
      serial_number: asset?.serial_number || '',
      purchase_date: asset?.purchase_date || '',
      purchase_price: asset?.purchase_price ?? undefined,
      warranty_expiry: asset?.warranty_expiry || '',
      expected_lifespan_years: asset?.expected_lifespan_years ?? undefined,
      condition: asset?.condition || 'good',
      notes: asset?.notes || '',
    },
  })

  async function onSubmit(data: AssetFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('asset_type', data.asset_type)
    formData.set('unit_id', data.unit_id)
    if (data.make) formData.set('make', data.make)
    if (data.model) formData.set('model', data.model)
    if (data.serial_number) formData.set('serial_number', data.serial_number)
    if (data.purchase_date) formData.set('purchase_date', data.purchase_date)
    if (data.purchase_price !== undefined && data.purchase_price !== null) {
      formData.set('purchase_price', String(data.purchase_price))
    }
    if (data.warranty_expiry) formData.set('warranty_expiry', data.warranty_expiry)
    if (data.expected_lifespan_years !== undefined && data.expected_lifespan_years !== null) {
      formData.set('expected_lifespan_years', String(data.expected_lifespan_years))
    }
    if (data.condition) formData.set('condition', data.condition)
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateAssetAction(asset.id, formData)
        : await createAssetAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Asset updated' : 'Asset created')
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

  function formatUnitAddress(unit: Tables<'units'>) {
    const parts = [unit.address]
    if (unit.unit_number) parts.push(`Unit ${unit.unit_number}`)
    return parts.join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this asset.'
              : 'Add a new appliance or equipment to a unit.'}
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
                    <Input placeholder="Kitchen Refrigerator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="asset_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatAssetType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'good'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetConditionOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {formatCondition(c)}
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
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {formatUnitAddress(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Samsung"
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
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="RF28T5001SR"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABC123456789"
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
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price ($)</FormLabel>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="warranty_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiry</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                    name="expected_lifespan_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Lifespan (years)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="10"
                            {...field}
                            value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? undefined : parseInt(val, 10))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this asset..."
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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Asset' : 'Add Asset'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
