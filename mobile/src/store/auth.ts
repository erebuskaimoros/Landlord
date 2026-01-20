import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { Tables } from '../types/database'

type Organization = Tables<'organizations'>
type OrganizationMember = Tables<'organization_members'>

interface AuthState {
  session: Session | null
  user: User | null
  profile: Tables<'user_profiles'> | null
  organization: Organization | null
  membership: OrganizationMember | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  organization: null,
  membership: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // Fetch user's organization membership
        const { data: membership } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', session.user.id)
          .limit(1)
          .single()

        let organization: Organization | null = null
        if (membership) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', (membership as any).organization_id)
            .single()
          organization = org as Organization | null
        }

        set({
          session,
          user: session.user,
          profile: profile as Tables<'user_profiles'> | null,
          organization,
          membership: membership as OrganizationMember | null,
          isLoading: false,
          isInitialized: true,
        })
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          organization: null,
          membership: null,
          isLoading: false,
          isInitialized: true,
        })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({
            session: null,
            user: null,
            profile: null,
            organization: null,
            membership: null,
          })
        } else if (session?.user) {
          // Refresh user data on sign in
          await get().refreshSession()
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ isLoading: false, isInitialized: true })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        set({ isLoading: false })
        return { error }
      }

      // Refresh session to get user data
      await get().refreshSession()
      return { error: null }
    } catch (error) {
      set({ isLoading: false })
      return { error: error as Error }
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    await supabase.auth.signOut()
    set({
      session: null,
      user: null,
      profile: null,
      organization: null,
      membership: null,
      isLoading: false,
    })
  },

  refreshSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      set({
        session: null,
        user: null,
        profile: null,
        organization: null,
        membership: null,
        isLoading: false,
      })
      return
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Fetch user's organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    let organization: Organization | null = null
    if (membership) {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', (membership as any).organization_id)
        .single()
      organization = org as Organization | null
    }

    set({
      session,
      user: session.user,
      profile: profile as Tables<'user_profiles'> | null,
      organization,
      membership: membership as OrganizationMember | null,
      isLoading: false,
    })
  },
}))
