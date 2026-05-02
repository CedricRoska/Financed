-- =============================================================================
-- Migration 0002 — Résolution manuelle du remboursement attendu
-- =============================================================================
-- Ajoute 3 colonnes à transaction_annotations pour permettre à l'utilisateur
-- de marquer un remboursement comme résolu sans matching automatique :
--   - refund_resolved_at : timestamp de résolution (null = pas encore résolu)
--   - refund_resolved_kind : type de résolution
--       'cash'  → reçu en liquide (invisible dans le dashboard)
--       'wire'  → reçu par virement (visible dans le dashboard)
--       'loss'  → passé en perte (créance abandonnée)
--   - refund_resolved_note : note libre optionnelle
--
-- Une transaction est "validée" quand :
--   - elle a une catégorie ET
--   - (pas d'expected_refund_from OU refund_resolved_at non null)
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================

alter table public.transaction_annotations
  add column if not exists refund_resolved_at timestamptz,
  add column if not exists refund_resolved_kind text,
  add column if not exists refund_resolved_note text;

-- Contrainte sur les valeurs autorisées de refund_resolved_kind
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transaction_annotations_refund_resolved_kind_check'
  ) then
    alter table public.transaction_annotations
      add constraint transaction_annotations_refund_resolved_kind_check
      check (refund_resolved_kind in ('cash', 'wire', 'loss'));
  end if;
end$$;

comment on column public.transaction_annotations.refund_resolved_at is
  'Timestamp de résolution manuelle du remboursement attendu (null si non résolu).';

comment on column public.transaction_annotations.refund_resolved_kind is
  'Type de résolution : cash (liquide), wire (virement), loss (passé en perte).';

comment on column public.transaction_annotations.refund_resolved_note is
  'Note libre optionnelle attachée à la résolution du remboursement.';

-- Index pour requêter rapidement les remboursements pendants
create index if not exists idx_annotations_pending_refund
  on public.transaction_annotations (user_id)
  where expected_refund_from is not null and refund_resolved_at is null;

-- Fin migration 0002.
