-- =============================================================================
-- Migration 0001 — Schema initial Financed
-- =============================================================================
-- Architecture event-sourced (PRD Innovation #4) :
--   - tables FACTS (immutables) : accounts, transactions
--   - tables METADATA (mutables) : transaction_annotations
--   - table AUDIT : audit_log
-- Toutes les tables sont scopées par user_id et protégées par RLS.
-- Cette migration est idempotente : ré-applicable sans erreur.
--
-- À appliquer via : Dashboard Supabase → SQL editor → Run.
-- =============================================================================


-- =============================================================================
-- 1. ACCOUNTS — comptes bancaires nommés (FR6, FR7, FR8, FR9)
-- =============================================================================

create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 100),
  is_hybrid   boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.accounts is
  'Comptes bancaires nommés par l''utilisateur. is_hybrid=true active le mode pro/perso (FR7).';

create index if not exists idx_accounts_user_id on public.accounts(user_id);


-- =============================================================================
-- 2. TRANSACTIONS — facts immutables importés depuis les relevés bancaires
-- =============================================================================
-- Append-only : pas d'UPDATE possible côté user (RLS deny).
-- UNIQUE(user_id, account_id, hash) pour la détection de doublons à l'import (NFR14).
-- Cascade DELETE depuis accounts : supprimer un compte purge ses transactions.

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid not null references public.accounts(id) on delete cascade,
  op_date     date not null,
  amount      numeric(14,2) not null,
  raw_label   text not null,
  hash        text not null,
  imported_at timestamptz not null default now(),
  unique (user_id, account_id, hash)
);

comment on table public.transactions is
  'Lignes de relevé bancaire brutes, immutables (NFR13). hash = sha256(op_date|amount|normalized_label) pour dédup.';

create index if not exists idx_transactions_user_account_date
  on public.transactions(user_id, account_id, op_date desc);


-- =============================================================================
-- 3. TRANSACTION_ANNOTATIONS — métadonnées mutables liées aux transactions
-- =============================================================================
-- Liaison 1-1 avec transactions via FK UNIQUE.
-- Sépare strictement les facts (transactions) des annotations utilisateur.
-- user_id denormalisé pour RLS perf sans JOIN.

create table if not exists public.transaction_annotations (
  id                      uuid primary key default gen_random_uuid(),
  transaction_id          uuid not null unique references public.transactions(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  category                text,
  comment                 text,
  pro_perso               text check (pro_perso in ('pro', 'perso')),
  expected_refund_from    text,
  expected_refund_label   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.transaction_annotations is
  'Annotations utilisateur (catégorie, commentaire, lettrage à venir, remboursement attendu). Mutables à vie (FR32).';

create index if not exists idx_annotations_user_id
  on public.transaction_annotations(user_id);

-- Trigger : updated_at synchronisé automatiquement à chaque UPDATE
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_annotations_updated_at on public.transaction_annotations;
create trigger trg_annotations_updated_at
before update on public.transaction_annotations
for each row execute function public.tg_set_updated_at();


-- =============================================================================
-- 4. AUDIT_LOG — journal des opérations sensibles (NFR16)
-- =============================================================================
-- Insert-only au niveau usage. user_id ON DELETE SET NULL pour préserver
-- la traçabilité après suppression de compte tout en cassant le lien identifiable.

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.audit_log is
  'Journal des opérations sensibles : login, import, export, deletion (NFR16). Insert-only.';

create index if not exists idx_audit_log_user_created
  on public.audit_log(user_id, created_at desc);


-- =============================================================================
-- 5. ROW-LEVEL SECURITY
-- =============================================================================
-- Activée sur les 4 tables. Policies basées sur auth.uid() = user_id.
-- transactions : pas d'UPDATE ni DELETE côté user (NFR13). La cascade depuis
-- auth.users s'effectue via le superuser interne et n'est pas soumise aux RLS.

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_annotations enable row level security;
alter table public.audit_log enable row level security;


-- accounts : SELECT, INSERT, UPDATE, DELETE pour le owner
drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
  for select using (auth.uid() = user_id);

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own on public.accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_delete_own on public.accounts
  for delete using (auth.uid() = user_id);


-- transactions : SELECT et INSERT seulement. Pas d'UPDATE, pas de DELETE.
-- (Suppression cascade depuis accounts → transactions reste fonctionnelle car gérée
-- par le moteur Postgres, pas par les RLS user.)
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert with check (auth.uid() = user_id);


-- transaction_annotations : SELECT, INSERT, UPDATE, DELETE pour le owner
drop policy if exists annotations_select_own on public.transaction_annotations;
create policy annotations_select_own on public.transaction_annotations
  for select using (auth.uid() = user_id);

drop policy if exists annotations_insert_own on public.transaction_annotations;
create policy annotations_insert_own on public.transaction_annotations
  for insert with check (auth.uid() = user_id);

drop policy if exists annotations_update_own on public.transaction_annotations;
create policy annotations_update_own on public.transaction_annotations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists annotations_delete_own on public.transaction_annotations;
create policy annotations_delete_own on public.transaction_annotations
  for delete using (auth.uid() = user_id);


-- audit_log : SELECT et INSERT seulement (insert-only au niveau usage)
drop policy if exists audit_log_select_own on public.audit_log;
create policy audit_log_select_own on public.audit_log
  for select using (auth.uid() = user_id);

drop policy if exists audit_log_insert_own on public.audit_log;
create policy audit_log_insert_own on public.audit_log
  for insert with check (auth.uid() = user_id);


-- =============================================================================
-- Fin de la migration 0001.
-- =============================================================================
