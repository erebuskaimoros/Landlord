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
import { unitFullSchema, type UnitFullInput } from '@/lib/validations/unit'
import { createUnitAction, updateUnitAction } from '@/app/(dashboard)/units/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Tables } from '@/types/database'

const PROPERTY_TYPES = [
  'Single Family',
  'Townhouse',
  'Condo',
  'Apartment',
  'Duplex',
  'Triplex',
  'Fourplex',
  'Multi-Family',
  'Mobile Home',
  'Other',
]

const COMMON_AMENITIES = [
  'Central AC',
  'Central Heat',
  'Washer/Dryer',
  'Washer/Dryer Hookups',
  'Dishwasher',
  'Garage',
  'Carport',
  'Covered Parking',
  'Pool',
  'Gym',
  'Patio/Balcony',
  'Fenced Yard',
  'Storage',
  'Fireplace',
  'Hardwood Floors',
  'Pet Friendly',
]

interface UnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: Tables<'units'> | null
  buildings?: Tables<'buildings'>[]
  onSuccess?: () => void
}

export function UnitForm({ open, onOpenChange, unit, buildings = [], onSuccess }: UnitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPropertyDetails, setShowPropertyDetails] = useState(!!unit)
  const [showMarketing, setShowMarketing] = useState(!!unit?.listing_description || !!unit?.rental_price)
  const isEditing = !!unit

  const form = useForm<UnitFullInput>({
    resolver: zodResolver(unitFullSchema),
    defaultValues: {
      address: unit?.address || '',
      unit_number: unit?.unit_number || '',
      city: unit?.city || '',
      state: unit?.state || '',
      zip_code: unit?.zip_code || '',
      building_id: unit?.building_id || '',
      property_type: unit?.property_type || '',
      bedrooms: unit?.bedrooms ?? undefined,
      bathrooms: unit?.bathrooms ?? undefined,
      square_footage: unit?.square_footage ?? undefined,
      year_built: unit?.year_built ?? undefined,
      status: unit?.status || 'vacant',
      rental_price: unit?.rental_price ?? undefined,
      listing_description: unit?.listing_description || '',
      pet_policy: unit?.pet_policy || '',
      amenities: unit?.amenities || [],
      notes: unit?.notes || '',
    },
  })

  async function onSubmit(data: UnitFullInput) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('address', data.address)
    if (data.unit_number) formData.set('unit_number', data.unit_number)
    if (data.city) formData.set('city', data.city)
    if (data.state) formData.set('state', data.state)
    if (data.zip_code) formData.set('zip_code', data.zip_code)
    formData.set('building_id', data.building_id || '')
    if (data.property_type) formData.set('property_type', data.property_type)
    if (data.bedrooms !== undefined && data.bedrooms !== null) formData.set('bedrooms', String(data.bedrooms))
    if (data.bathrooms !== undefined && data.bathrooms !== null) formData.set('bathrooms', String(data.bathrooms))
    if (data.square_footage !== undefined && data.square_footage !== null) formData.set('square_footage', String(data.square_footage))
    if (data.year_built !== undefined && data.year_built !== null) formData.set('year_built', String(data.year_built))
    formData.set('status', data.status || 'vacant')
    if (data.rental_price !== undefined && data.rental_price !== null) formData.set('rental_price', String(data.rental_price))
    if (data.listing_description) formData.set('listing_description', data.listing_description)
    if (data.pet_policy) formData.set('pet_policy', data.pet_policy)
    if (data.amenities && data.amenities.length > 0) formData.set('amenities', JSON.stringify(data.amenities))
    if (data.notes) formData.set('notes', data.notes)

    try {
      const result = isEditing
        ? await updateUnitAction(unit.id, formData)
        : await createUnitAction(formData)

      if (result.success) {
        toast.success(isEditing ? 'Unit updated' : 'Unit created')
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

  const toggleAmenity = (amenity: string) => {
    const current = form.getValues('amenities') || []
    if (current.includes(amenity)) {
      form.setValue('amenities', current.filter((a) => a !== amenity))
    } else {
      form.setValue('amenities', [...current, amenity])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this unit.'
              : 'Add a new rental unit to your portfolio. Start with the address - you can add more details later.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Address Info */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt 1A" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="CA" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="90210" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {buildings.length > 0 && (
              <FormField
                control={form.control}
                name="building_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Standalone unit (no building)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Standalone unit (no building)</SelectItem>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Property Details Section */}
            <Collapsible open={showPropertyDetails} onOpenChange={setShowPropertyDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Property Details</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPropertyDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="property_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROPERTY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beds</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="3"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baths</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="2"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="square_footage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sq Ft</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="1500"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year_built"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Built</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1800"
                            max={new Date().getFullYear() + 5}
                            placeholder="2000"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Marketing Section */}
            <Collapsible open={showMarketing} onOpenChange={setShowMarketing}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Marketing & Rental</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMarketing ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rental_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="1500"
                            value={field.value != null ? String(field.value) : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pet_policy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Policy</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select policy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="No Pets">No Pets</SelectItem>
                            <SelectItem value="Cats Only">Cats Only</SelectItem>
                            <SelectItem value="Dogs Only">Dogs Only</SelectItem>
                            <SelectItem value="Cats & Dogs">Cats & Dogs</SelectItem>
                            <SelectItem value="All Pets Welcome">All Pets Welcome</SelectItem>
                            <SelectItem value="Case by Case">Case by Case</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="listing_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this property for potential tenants..."
                          className="min-h-[80px]"
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
                  name="amenities"
                  render={() => (
                    <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {COMMON_AMENITIES.map((amenity) => {
                          const isSelected = (form.watch('amenities') || []).includes(amenity)
                          return (
                            <Button
                              key={amenity}
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleAmenity(amenity)}
                            >
                              {amenity}
                            </Button>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes about this unit..."
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
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Unit' : 'Add Unit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
