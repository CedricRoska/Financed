-- =============================================================================
-- Migration 0006 — Montant attendu de remboursement
-- =============================================================================
-- Ajoute `expected_refund_amount` à transaction_annotations pour permettre à
-- l'utilisateur de préciser combien (en € absolus) son débiteur doit lui
-- rembourser. NULL = remboursement total de la dépense (cas par défaut).
--
-- L'UI permet la saisie en € ou en % du montant de la dépense, mais on stocke
-- toujours la valeur absolue. Le pourcentage est recalculé à l'affichage
-- depuis le montant de la dépense.
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================

alter table public.transaction_annotations
  add column if not exists expected_refund_amount numeric(12, 2);

comment on column public.transaction_annotations.expected_refund_amount is
  'Montant attendu en € absolu du remboursement. NULL = remboursement total.';

-- Fin migration 0006.
