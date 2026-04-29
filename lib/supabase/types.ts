/**
 * Types `Database` synchronisés à la main avec `supabase/migrations/0001_init_schema.sql`.
 *
 * IMPORTANT : à chaque évolution de schéma, mettre à jour CE fichier en parallèle
 * du fichier de migration. Pas de génération automatique en V1 (décision auteur,
 * pas de CLI Supabase).
 */

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          is_hybrid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_hybrid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_hybrid?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          op_date: string
          amount: number
          raw_label: string
          hash: string
          imported_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          op_date: string
          amount: number
          raw_label: string
          hash: string
          imported_at?: string
        }
        Update: never
        Relationships: []
      }
      transaction_annotations: {
        Row: {
          id: string
          transaction_id: string
          user_id: string
          category: string | null
          comment: string | null
          pro_perso: 'pro' | 'perso' | null
          expected_refund_from: string | null
          expected_refund_label: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id: string
          category?: string | null
          comment?: string | null
          pro_perso?: 'pro' | 'perso' | null
          expected_refund_from?: string | null
          expected_refund_label?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          user_id?: string
          category?: string | null
          comment?: string | null
          pro_perso?: 'pro' | 'perso' | null
          expected_refund_from?: string | null
          expected_refund_label?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
