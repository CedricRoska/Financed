-- =============================================================================
-- Migration 0005 — Flag "à investiguer"
-- =============================================================================
-- Ajoute une colonne `to_investigate` à transaction_annotations pour permettre
-- à l'utilisateur de flaguer une transaction qu'il ne sait pas encore catégoriser
-- (besoin d'investigation : relevé bancaire, vérif conjoint, etc.).
--
-- Une transaction flaggée n'est jamais considérée comme "validée", même si elle
-- a une catégorie. Le flag prime sur la catégorisation.
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================

alter table public.transaction_annotations
  add column if not exists to_investigate boolean not null default false;

comment on column public.transaction_annotations.to_investigate is
  'Flag user "à investiguer". Transaction non validée tant que le flag est true.';

-- Fin migration 0005.
