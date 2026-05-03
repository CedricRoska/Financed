/**
 * Types `Database` synchronisés à la main avec `supabase/migrations/0001_init_schema.sql`.
 *
 * IMPORTANT : à chaque évolution de schéma, mettre à jour CE fichier en parallèle
 * du fichier de migration. Pas de génération automatique en V1 (décision auteur,
 * pas de CLI Supabase).
 *
 * Note : les UPDATE sur `transactions` et `audit_log` sont rejetés au niveau RLS
 * (NFR13, append-only). Le typage TS reste permissif côté Update : c'est la base
 * de données qui fait foi, pas le compilateur — cohérent avec la doctrine
 * "the app reflects, doesn't lie".
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
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
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
          bank_op_type: string | null
          bank_category: string | null
          bank_subcategory: string | null
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
          bank_op_type?: string | null
          bank_category?: string | null
          bank_subcategory?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          op_date?: string
          amount?: number
          raw_label?: string
          hash?: string
          imported_at?: string
          bank_op_type?: string | null
          bank_category?: string | null
          bank_subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      transaction_annotations: {
        Row: {
          id: string
          transaction_id: string
          user_id: string
          category: string | null
          subcategory: string | null
          comment: string | null
          pro_perso: 'pro' | 'perso' | null
          expected_refund_from: string | null
          expected_refund_label: string | null
          refund_resolved_at: string | null
          refund_resolved_kind: 'cash' | 'wire' | 'loss' | null
          refund_resolved_note: string | null
          to_investigate: boolean
          expected_refund_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id: string
          category?: string | null
          subcategory?: string | null
          comment?: string | null
          pro_perso?: 'pro' | 'perso' | null
          expected_refund_from?: string | null
          expected_refund_label?: string | null
          refund_resolved_at?: string | null
          refund_resolved_kind?: 'cash' | 'wire' | 'loss' | null
          refund_resolved_note?: string | null
          to_investigate?: boolean
          expected_refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          user_id?: string
          category?: string | null
          subcategory?: string | null
          comment?: string | null
          pro_perso?: 'pro' | 'perso' | null
          expected_refund_from?: string | null
          expected_refund_label?: string | null
          refund_resolved_at?: string | null
          refund_resolved_kind?: 'cash' | 'wire' | 'loss' | null
          refund_resolved_note?: string | null
          to_investigate?: boolean
          expected_refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transaction_annotations_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: true
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transaction_annotations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
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
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
