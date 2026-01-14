export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'manager' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'manager' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'owner' | 'manager' | 'viewer'
          token: string
          invited_by: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: 'owner' | 'manager' | 'viewer'
          token: string
          invited_by: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'owner' | 'manager' | 'viewer'
          token?: string
          invited_by?: string
          expires_at?: string
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      buildings: {
        Row: {
          id: string
          organization_id: string
          name: string
          address: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          address: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          address?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          organization_id: string
          building_id: string | null
          address: string
          unit_number: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          property_type: string | null
          bedrooms: number | null
          bathrooms: number | null
          square_footage: number | null
          year_built: number | null
          status: 'occupied' | 'vacant' | 'sold'
          listing_description: string | null
          rental_price: number | null
          pet_policy: string | null
          amenities: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          building_id?: string | null
          address: string
          unit_number?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          property_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_footage?: number | null
          year_built?: number | null
          status?: 'occupied' | 'vacant' | 'sold'
          listing_description?: string | null
          rental_price?: number | null
          pet_policy?: string | null
          amenities?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          building_id?: string | null
          address?: string
          unit_number?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          property_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_footage?: number | null
          year_built?: number | null
          status?: 'occupied' | 'vacant' | 'sold'
          listing_description?: string | null
          rental_price?: number | null
          pet_policy?: string | null
          amenities?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      building_unit_allocations: {
        Row: {
          id: string
          building_id: string
          unit_id: string
          allocation_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          unit_id: string
          allocation_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          unit_id?: string
          allocation_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          organization_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          organization_id: string
          unit_id: string
          tenant_id: string
          start_date: string
          end_date: string | null
          rent_amount: number
          security_deposit: number | null
          deposit_returned_date: string | null
          terms: string | null
          status: 'draft' | 'active' | 'expired' | 'terminated'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          unit_id: string
          tenant_id: string
          start_date: string
          end_date?: string | null
          rent_amount: number
          security_deposit?: number | null
          deposit_returned_date?: string | null
          terms?: string | null
          status?: 'draft' | 'active' | 'expired' | 'terminated'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          unit_id?: string
          tenant_id?: string
          start_date?: string
          end_date?: string | null
          rent_amount?: number
          security_deposit?: number | null
          deposit_returned_date?: string | null
          terms?: string | null
          status?: 'draft' | 'active' | 'expired' | 'terminated'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lease_documents: {
        Row: {
          id: string
          lease_id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      tenant_timeline_events: {
        Row: {
          id: string
          tenant_id: string
          event_type: 'lease_signed' | 'move_in' | 'move_out' | 'rent_payment' | 'late_payment' | 'maintenance_request' | 'inspection' | 'communication' | 'violation' | 'renewal' | 'other'
          title: string
          description: string | null
          event_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          event_type: 'lease_signed' | 'move_in' | 'move_out' | 'rent_payment' | 'late_payment' | 'maintenance_request' | 'inspection' | 'communication' | 'violation' | 'renewal' | 'other'
          title: string
          description?: string | null
          event_date?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          event_type?: 'lease_signed' | 'move_in' | 'move_out' | 'rent_payment' | 'late_payment' | 'maintenance_request' | 'inspection' | 'communication' | 'violation' | 'renewal' | 'other'
          title?: string
          description?: string | null
          event_date?: string
          created_by?: string | null
          created_at?: string
        }
      }
      transaction_categories: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          type: 'income' | 'expense'
          is_system_default: boolean
          schedule_e_line: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          type: 'income' | 'expense'
          is_system_default?: boolean
          schedule_e_line?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          type?: 'income' | 'expense'
          is_system_default?: boolean
          schedule_e_line?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          organization_id: string
          unit_id: string | null
          tenant_id: string | null
          category_id: string | null
          type: 'income' | 'expense'
          description: string
          transaction_date: string
          expected_amount: number | null
          actual_amount: number
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          unit_id?: string | null
          tenant_id?: string | null
          category_id?: string | null
          type: 'income' | 'expense'
          description: string
          transaction_date: string
          expected_amount?: number | null
          actual_amount: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          unit_id?: string | null
          tenant_id?: string | null
          category_id?: string | null
          type?: 'income' | 'expense'
          description?: string
          transaction_date?: string
          expected_amount?: number | null
          actual_amount?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transaction_allocations: {
        Row: {
          id: string
          transaction_id: string
          unit_id: string
          amount: number
          percentage: number | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          unit_id: string
          amount: number
          percentage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          unit_id?: string
          amount?: number
          percentage?: number | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      user_has_role: {
        Args: {
          org_id: string
          required_role: 'owner' | 'manager' | 'viewer'
        }
        Returns: boolean
      }
      get_dashboard_stats: {
        Args: {
          org_id: string
        }
        Returns: {
          total_units: number
          vacant_units: number
          total_tenants: number
          active_leases: number
          total_transactions: number
          total_buildings: number
        }[]
      }
      get_financial_totals: {
        Args: {
          org_id: string
        }
        Returns: {
          total_income: number
          total_expense: number
          net_income: number
        }[]
      }
    }
    Enums: {
      user_role: 'owner' | 'manager' | 'viewer'
      unit_status: 'occupied' | 'vacant' | 'sold'
      lease_status: 'draft' | 'active' | 'expired' | 'terminated'
      timeline_event_type: 'lease_signed' | 'move_in' | 'move_out' | 'rent_payment' | 'late_payment' | 'maintenance_request' | 'inspection' | 'communication' | 'violation' | 'renewal' | 'other'
      transaction_type: 'income' | 'expense'
    }
  }
}

// Helper types for easier use
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
