/**
 * Stub `Database` type — sera régénéré en Goal 3 (schéma initial) via :
 *   npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > lib/supabase/types.ts
 *
 * Tant que le schéma n'existe pas, on expose une structure vide qui satisfait
 * la signature des helpers `createBrowserClient` et `createServerClient`.
 */

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
