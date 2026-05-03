-- =============================================================================
-- Migration 0003 — Sous-catégorie
-- =============================================================================
-- Ajoute une colonne `subcategory` à transaction_annotations pour permettre
-- une taxonomie à 2 niveaux (ex: "Abonnements" / "Claude").
--
-- La sous-catégorie est libre (TEXT), pas de table dédiée. Le lien avec la
-- catégorie parente est implicite : si l'utilisateur a déjà annoté
-- (category=Abonnements, subcategory=Claude), "Claude" sera proposé en sous
-- de "Abonnements" la prochaine fois.
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================

alter table public.transaction_annotations
  add column if not exists subcategory text;

comment on column public.transaction_annotations.subcategory is
  'Sous-catégorie libre (ex: "Claude" sous "Abonnements"). Optionnelle.';

-- Fin migration 0003.
