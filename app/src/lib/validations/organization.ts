import { z } from 'zod'

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
})

export const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'viewer'], {
    message: 'Please select a role',
  }),
})

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().optional().nullable(),
})

export type OrganizationFormValues = z.infer<typeof organizationSchema>
export type InvitationFormValues = z.infer<typeof invitationSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
