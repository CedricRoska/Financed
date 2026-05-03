-- =============================================================================
-- Migration 0004 — Métadonnées bancaires brutes (BP)
-- =============================================================================
-- Ajoute des colonnes à transactions pour stocker les classifications brutes
-- fournies par la banque (BP) dans le CSV :
--   - bank_op_type (ex: "Carte bancaire", "Virement", "Frais bancaires")
--   - bank_category (ex: "Alimentation", "Loisirs et vacances")
--   - bank_subcategory (ex: "Restaurant", "Video, Musique et jeux")
--
-- Ces données sont immutables comme le reste de transactions (RLS deny UPDATE).
-- Elles servent à :
--   - Pré-remplir les comboboxes de l'utilisateur dans la Sheet d'édition
--   - Afficher la classification BP comme "suggestion" si l'utilisateur n'a
--     pas encore annoté la transaction
--
-- L'utilisateur reste libre de surcharger avec sa propre taxonomie. La
-- doctrine "user always validates" est préservée : la pré-cat n'est pas
-- une validation automatique, juste un point de départ.
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================

alter table public.transactions
  add column if not exists bank_op_type text,
  add column if not exists bank_category text,
  add column if not exists bank_subcategory text;

comment on column public.transactions.bank_op_type is
  'Type d''opération brute fourni par la banque (ex: "Carte bancaire").';

comment on column public.transactions.bank_category is
  'Catégorie brute fournie par la banque (ex: "Alimentation").';

comment on column public.transactions.bank_subcategory is
  'Sous-catégorie brute fournie par la banque (ex: "Restaurant").';

-- Fin migration 0004.
