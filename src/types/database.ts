// src/types/database.ts
// Types générés manuellement depuis le schéma SQL
// En production : générer automatiquement avec `npx supabase gen types typescript --linked`

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:             string;
          firstname:      string;
          lastname:       string;
          phone:          string | null;
          type:           'client' | 'pro';
          salon_id:       string | null;
          plan:           'trial' | 'starter' | 'pro';
          trial_ends_at:  string | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      salons: {
        Row: {
          id:           string;
          owner_id:     string;
          name:         string;
          category:     'hammam'|'coiffure'|'onglerie'|'massage'|'esthetic'|'barbier'|'autre';
          city:         string;
          address:      string | null;
          phone:        string | null;
          email:        string | null;
          description:  string | null;
          rating:       number;
          review_count: number;
          active:       boolean;
          whatsapp:     string | null;
          instagram:    string | null;
          cover_image:  string | null;
          pin:          string;
          created_at:   string;
          updated_at:   string;
        };
        Insert: Partial<Database['public']['Tables']['salons']['Row']> & {
          owner_id: string; name: string; category: string; city: string;
        };
        Update: Partial<Database['public']['Tables']['salons']['Row']>;
      };
      service_categories: {
        Row: {
          id:         string;
          salon_id:   string;
          name:       string;
          color:      string;
          order:      number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['service_categories']['Row'], 'id'|'created_at'>;
        Update: Partial<Database['public']['Tables']['service_categories']['Row']>;
      };
      services: {
        Row: {
          id:          string;
          salon_id:    string;
          cat_id:      string | null;
          name:        string;
          description: string | null;
          price_type:  'fixed' | 'from' | 'quote';
          price:       number;
          duration:    number;
          staff_ids:   string[];
          active:      boolean;
          order:       number;
          created_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id'|'created_at'>;
        Update: Partial<Database['public']['Tables']['services']['Row']>;
      };
      staff: {
        Row: {
          id:         string;
          salon_id:   string;
          firstname:  string;
          lastname:   string;
          role:       string;
          days:       string[];
          start_time: string;
          end_time:   string;
          phone:      string | null;
          avatar:     string | null;
          active:     boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id'|'created_at'>;
        Update: Partial<Database['public']['Tables']['staff']['Row']>;
      };
      schedules: {
        Row: {
          id:        string;
          salon_id:  string;
          lu_open: boolean; lu_start: string; lu_end: string;
          ma_open: boolean; ma_start: string; ma_end: string;
          me_open: boolean; me_start: string; me_end: string;
          je_open: boolean; je_start: string; je_end: string;
          ve_open: boolean; ve_start: string; ve_end: string;
          sa_open: boolean; sa_start: string; sa_end: string;
          di_open: boolean; di_start: string; di_end: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['schedules']['Row']> & { salon_id: string };
        Update: Partial<Database['public']['Tables']['schedules']['Row']>;
      };
      blocks: {
        Row: {
          id:         string;
          salon_id:   string;
          staff_id:   string | null;
          label:      string;
          date:       string;
          start_time: string;
          end_time:   string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['blocks']['Row'], 'id'|'created_at'>;
        Update: Partial<Database['public']['Tables']['blocks']['Row']>;
      };
      rdvs: {
        Row: {
          id:           string;
          client_id:    string | null;
          client_name:  string;
          client_phone: string | null;
          salon_id:     string;
          salon_name:   string;
          service_id:   string;
          service_name: string;
          staff_id:     string;
          staff_name:   string;
          date:         string;
          start_time:   string;
          duration:     number;
          price:        number;
          price_type:   'fixed' | 'from' | 'quote';
          status:       'confirmed' | 'cancelled' | 'completed' | 'no-show';
          notes:        string | null;
          group_id:     string | null;
          source:       'client' | 'pro';
          created_at:   string;
          updated_at:   string;
        };
        Insert: Omit<Database['public']['Tables']['rdvs']['Row'], 'id'|'created_at'|'updated_at'>;
        Update: Partial<Database['public']['Tables']['rdvs']['Row']>;
      };
    };
  };
}

// Raccourcis pratiques
export type Profile          = Database['public']['Tables']['profiles']['Row'];
export type Salon            = Database['public']['Tables']['salons']['Row'];
export type ServiceCategory  = Database['public']['Tables']['service_categories']['Row'];
export type Service          = Database['public']['Tables']['services']['Row'];
export type Staff            = Database['public']['Tables']['staff']['Row'];
export type Schedule         = Database['public']['Tables']['schedules']['Row'];
export type Block            = Database['public']['Tables']['blocks']['Row'];
export type Rdv              = Database['public']['Tables']['rdvs']['Row'];
