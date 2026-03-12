export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'gift_card'
export type AppRole = 'owner' | 'admin' | 'receptionist' | 'staff' | 'cleaner' | 'client'

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" }
  public: {
    Tables: {
      settings: {
        Row: {
          id: string; business_name: string; business_phone: string | null
          business_email: string | null; business_address: string | null
          logo_url: string | null; open_time: string; close_time: string
          currency: string; gallery_images: string[]; payment_methods: string[]
          created_at: string; updated_at: string
        }
        Insert: { id?: string; business_name?: string; business_phone?: string | null
          business_email?: string | null; business_address?: string | null
          logo_url?: string | null; open_time?: string; close_time?: string
          currency?: string; gallery_images?: string[]; payment_methods?: string[]
          created_at?: string; updated_at?: string }
        Update: { id?: string; business_name?: string; business_phone?: string | null
          business_email?: string | null; business_address?: string | null
          logo_url?: string | null; open_time?: string; close_time?: string
          currency?: string; gallery_images?: string[]; payment_methods?: string[]
          created_at?: string; updated_at?: string }
        Relationships: []
      }
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole; created_at: string }
        Insert: { id?: string; user_id: string; role: AppRole; created_at?: string }
        Update: { id?: string; user_id?: string; role?: AppRole; created_at?: string }
        Relationships: []
      }
      staff: {
        Row: {
          id: string; user_id: string | null; name: string; email: string | null
          phone: string | null; role: string; specialties: string[]
          avatar_url: string | null; is_active: boolean; created_at: string; updated_at: string
        }
        Insert: { id?: string; user_id?: string | null; name: string; email?: string | null
          phone?: string | null; role?: string; specialties?: string[]
          avatar_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string | null; name?: string; email?: string | null
          phone?: string | null; role?: string; specialties?: string[]
          avatar_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      service_variants: {
        Row: { id: string; service_id: string; name: string; price_adjustment: number; duration_adjustment: number; sort_order: number; is_active: boolean; created_at: string }
        Insert: { id?: string; service_id: string; name: string; price_adjustment?: number; duration_adjustment?: number; sort_order?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; service_id?: string; name?: string; price_adjustment?: number; duration_adjustment?: number; sort_order?: number; is_active?: boolean }
        Relationships: []
      }
      service_addons: {
        Row: { id: string; service_id: string; name: string; description: string | null; price: number; duration_adjustment: number; sort_order: number; is_active: boolean; created_at: string }
        Insert: { id?: string; service_id: string; name: string; description?: string | null; price?: number; duration_adjustment?: number; sort_order?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; service_id?: string; name?: string; description?: string | null; price?: number; duration_adjustment?: number; sort_order?: number; is_active?: boolean }
        Relationships: []
      }
      services: {
        Row: {
          id: string; name: string; description: string | null; category: string | null
          price: number | null; duration_minutes: number; is_active: boolean
          created_at: string; updated_at: string
        }
        Insert: { id?: string; name: string; description?: string | null; category?: string | null
          price?: number | null; duration_minutes?: number; is_active?: boolean
          created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; description?: string | null; category?: string | null
          price?: number | null; duration_minutes?: number; is_active?: boolean
          created_at?: string; updated_at?: string }
        Relationships: []
      }
      clients: {
        Row: {
          id: string; user_id: string | null; name: string; email: string | null
          phone: string | null; notes: string | null; loyalty_points: number
          total_visits: number; total_spent: number; avatar_url: string | null
          created_at: string; updated_at: string
        }
        Insert: { id?: string; user_id?: string | null; name: string; email?: string | null
          phone?: string | null; notes?: string | null; loyalty_points?: number
          total_visits?: number; total_spent?: number; avatar_url?: string | null
          created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string | null; name?: string; email?: string | null
          phone?: string | null; notes?: string | null; loyalty_points?: number
          total_visits?: number; total_spent?: number; avatar_url?: string | null
          created_at?: string; updated_at?: string }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string; client_id: string | null; staff_id: string | null; service_id: string | null
          client_name: string | null; client_phone: string | null; client_email: string | null
          service_name: string | null; staff_name: string | null
          preferred_date: string; preferred_time: string
          status: BookingStatus; notes: string | null; price: number | null
          duration_minutes: number | null; deposit_amount: number | null
          deposit_paid: boolean | null; booking_ref: string | null;
          variant_id: string | null; variant_name: string | null; selected_addons: any | null; services_cart: any | null
          created_at: string; updated_at: string
        }
        Insert: { id?: string; client_id?: string | null; staff_id?: string | null; service_id?: string | null
          client_name?: string | null; client_phone?: string | null; client_email?: string | null
          service_name?: string | null; staff_name?: string | null
          preferred_date: string; preferred_time: string
          status?: BookingStatus; notes?: string | null; price?: number | null
          duration_minutes?: number | null; deposit_amount?: number | null
          deposit_paid?: boolean | null; booking_ref?: string | null
          created_at?: string; updated_at?: string }
        Update: { id?: string; client_id?: string | null; staff_id?: string | null; service_id?: string | null
          client_name?: string | null; client_phone?: string | null; client_email?: string | null
          service_name?: string | null; staff_name?: string | null
          preferred_date?: string; preferred_time?: string
          status?: BookingStatus; notes?: string | null; price?: number | null
          duration_minutes?: number | null; deposit_amount?: number | null
          deposit_paid?: boolean | null; booking_ref?: string | null
          created_at?: string; updated_at?: string }
        Relationships: []
      }
      sales: {
        Row: {
          id: string; booking_id: string | null; client_id: string | null
          staff_id: string | null; client_name: string | null; service_name: string | null
          amount: number; payment_method: PaymentMethod; status: string
          notes: string | null; created_at: string
        }
        Insert: { id?: string; booking_id?: string | null; client_id?: string | null
          staff_id?: string | null; client_name?: string | null; service_name?: string | null
          amount: number; payment_method: PaymentMethod; status?: string
          notes?: string | null; created_at?: string }
        Update: { id?: string; booking_id?: string | null; client_id?: string | null
          staff_id?: string | null; client_name?: string | null; service_name?: string | null
          amount?: number; payment_method?: PaymentMethod; status?: string
          notes?: string | null; created_at?: string }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string; staff_id: string; date: string; check_in: string | null
          check_out: string | null; status: string; notes: string | null; created_at: string
        }
        Insert: { id?: string; staff_id: string; date: string; check_in?: string | null
          check_out?: string | null; status?: string; notes?: string | null; created_at?: string }
        Update: { id?: string; staff_id?: string; date?: string; check_in?: string | null
          check_out?: string | null; status?: string; notes?: string | null; created_at?: string }
        Relationships: []
      }
      gift_cards: {
        Row: {
          id: string; code: string; amount: number; balance: number
          purchaser_email: string | null; recipient_email: string | null
          recipient_name: string | null; message: string | null; status: string
          expires_at: string | null; created_at: string; updated_at: string
        }
        Insert: { id?: string; code: string; amount: number; balance: number
          purchaser_email?: string | null; recipient_email?: string | null
          recipient_name?: string | null; message?: string | null; status?: string
          expires_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; code?: string; amount?: number; balance?: number
          purchaser_email?: string | null; recipient_email?: string | null
          recipient_name?: string | null; message?: string | null; status?: string
          expires_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string; client_id: string | null; name: string; rating: number
          comment: string | null; visible: boolean; created_at: string
        }
        Insert: { id?: string; client_id?: string | null; name: string; rating: number
          comment?: string | null; visible?: boolean; created_at?: string }
        Update: { id?: string; client_id?: string | null; name?: string; rating?: number
          comment?: string | null; visible?: boolean; created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      has_role: { Args: { _role: AppRole; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: AppRole
      booking_status: BookingStatus
      payment_method: PaymentMethod
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "receptionist", "staff", "cleaner", "client"],
      booking_status: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
      payment_method: ["cash", "mobile_money", "bank_transfer", "gift_card"],
    },
  },
} as const
