---
title: 'Schema core — accounts / transactions / annotations / audit_log + RLS'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: 'bf28be0'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-foundation-setup.md'
  - '_bmad-output/implementation-artifacts/spec-auth-core.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'application persiste l'auth (managed Supabase) mais aucune donnée métier. Sans le squelette de schéma — comptes bancaires, transactions immutables, annotations mutables, journal d'audit — aucun goal suivant (import CSV, vue mensuelle, lettrage) ne peut commencer.

**Approach:** Créer une migration SQL idempotente qui matérialise l'**architecture event-sourced** du PRD (facts immutables / metadata mutables) avec 4 tables et leurs policies RLS strictes, à appliquer manuellement via le SQL editor du dashboard Supabase. Maintenir les types TypeScript correspondants à la main dans `lib/supabase/types.ts`.

## Boundaries & Constraints

**Always:**
- Migration SQL versionnée en git dans `supabase/migrations/0001_init_schema.sql` (convention de nommage compatible avec une activation future du CLI Supabase, mais pas de dépendance CLI pour V1)
- Toutes les tables ont une colonne `user_id` (directe ou transitive via FK) et une RLS basée sur `auth.uid() = user_id`
- `transactions` (faits bruts) : RLS deny UPDATE et DELETE — append-only au niveau base (NFR13)
- `transactions` : index UNIQUE sur `(user_id, account_id, hash)` pour la détection de doublons (NFR14)
- `transaction_annotations` : liaison 1-1 avec `transactions` via FK UNIQUE — séparation stricte facts/metadata
- Cascade DELETE depuis `auth.users` vers toutes les tables — supports FR5 (suppression compte cascade < 24h, NFR27)
- `audit_log` capture les actions sensibles (NFR16) — insert-only, pas d'update
- Application de la migration : copy/paste du fichier SQL dans le SQL editor du dashboard Supabase, exécution manuelle par l'auteur. Pas d'install CLI Supabase, pas de `supabase login`, pas de `db push`
- Types TypeScript dans `lib/supabase/types.ts` écrits à la main et synchronisés manuellement avec le schéma SQL. La synchronisation reste la responsabilité de l'auteur à chaque évolution de schéma
- Migration idempotente : `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` avant `CREATE POLICY` — pour permettre une ré-application safe en cas d'incident

**Ask First:**
- Si une table fictive (categories, imports, lettering_groups) doit finalement entrer dans ce spec malgré la décision de différer

**Never:**
- Pas de CLI Supabase en V1 (devDep, login, link, db push, gen types) — décision auteur
- Pas de table `categories` — annotation.category restera un TEXT pour l'instant
- Pas de table `imports` — différée à Goal 4 (import CSV)
- Pas de tables ou colonnes pour le lettrage 1-N — différé à un sous-spec ultérieur
- Pas de seed de catégories par défaut
- Pas de triggers Postgres complexes au-delà du `updated_at` automatique sur `transaction_annotations`
- Pas d'usage du `service_role` dans l'application V1
- Pas de tests pgTAP

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Insert account ok | user authentifié, name non vide | row créée, `id` retourné | N/A |
| Insert account without auth | requête anonyme | RLS rejette (0 rows) | erreur RLS Postgres |
| User A lit account de user B | user A authentifié | RLS filtre (0 rows) | N/A |
| UPDATE sur transactions | user authentifié tente UPDATE | RLS rejette | erreur Postgres |
| INSERT annotation pour transaction d'un autre user | tentative cross-user | RLS rejette | erreur RLS |
| Doublon hash insert | (user_id, account_id, hash) déjà présent | UNIQUE constraint rejette | erreur 23505 capturable |
| Cascade delete user | DELETE auth.users → user X | toutes les rows liées supprimées | N/A |
| Re-application migration | SQL relancé | aucune erreur (IF NOT EXISTS partout) | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/0001_init_schema.sql` -- migration SQL idempotente : 4 tables + RLS + index + contraintes + trigger updated_at
- `lib/supabase/types.ts` -- types `Database` typés à la main sur les 4 tables, en remplacement du stub
- `README.md` -- nouvelle section *"Apply database migration"* avec instructions copy/paste vers SQL editor

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/0001_init_schema.sql` -- créé avec :
  - `CREATE TABLE IF NOT EXISTS accounts` (id uuid PK default gen_random_uuid, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100), is_hybrid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())
  - `CREATE TABLE IF NOT EXISTS transactions` (id uuid PK, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, op_date date NOT NULL, amount numeric(14,2) NOT NULL, raw_label text NOT NULL, hash text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, account_id, hash))
  - `CREATE TABLE IF NOT EXISTS transaction_annotations` (id uuid PK, transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, category text, comment text, pro_perso text CHECK (pro_perso IN ('pro','perso')), expected_refund_from text, expected_refund_label text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())
  - `CREATE TABLE IF NOT EXISTS audit_log` (id uuid PK, user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, action text NOT NULL, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now())
  - Index : `(user_id, account_id, op_date DESC)` sur transactions ; `(user_id, created_at DESC)` sur audit_log
  - Trigger BEFORE UPDATE sur transaction_annotations qui set `updated_at = now()`
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sur les 4 tables
  - Policies : `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` pour SELECT, INSERT (les 4) et UPDATE (annotations seulement) basées sur `auth.uid() = user_id`. Pas de DELETE policy hors cascade auth.users (la cascade s'effectue via le superuser interne, indépendamment des RLS user)
  - Commentaires `COMMENT ON TABLE` pour chaque table
- [x] `lib/supabase/types.ts` -- réécrit avec les types complets des 4 tables (`Row`, `Insert`, `Update` chacun). `transactions` et `audit_log` ont `Update: never` pour matérialiser l'append-only au niveau TypeScript
- [x] `README.md` -- section *"Database setup"* ajoutée avec instructions copy/paste vers SQL editor + note sur l'idempotence + workflow d'évolution de schéma. Roadmap mise à jour (foundation, auth, schéma : done)

## Suggested Review Order

**Schema SQL (cœur du spec)**

- Migration entière, idempotente
  [`0001_init_schema.sql:1`](../../supabase/migrations/0001_init_schema.sql#L1)
- Table `accounts` — toggle is_hybrid pour pro/perso
  [`0001_init_schema.sql:21`](../../supabase/migrations/0001_init_schema.sql#L21)
- Table `transactions` — append-only avec UNIQUE(user_id, account_id, hash) pour dédup
  [`0001_init_schema.sql:43`](../../supabase/migrations/0001_init_schema.sql#L43)
- Table `transaction_annotations` — 1-1 FK UNIQUE, séparation facts/metadata
  [`0001_init_schema.sql:71`](../../supabase/migrations/0001_init_schema.sql#L71)
- Trigger `updated_at` automatique sur annotations
  [`0001_init_schema.sql:99`](../../supabase/migrations/0001_init_schema.sql#L99)
- Table `audit_log` — ON DELETE SET NULL pour préserver traçabilité après suppression compte
  [`0001_init_schema.sql:114`](../../supabase/migrations/0001_init_schema.sql#L114)
- RLS activée sur les 4 tables
  [`0001_init_schema.sql:135`](../../supabase/migrations/0001_init_schema.sql#L135)
- Policies transactions : pas d'UPDATE/DELETE côté user (NFR13)
  [`0001_init_schema.sql:163`](../../supabase/migrations/0001_init_schema.sql#L163)

**TypeScript types (sync manuelle avec SQL)**

- `Database['public']['Tables']` avec les 4 tables
  [`types.ts:11`](../../lib/supabase/types.ts#L11)
- `transactions.Update: never` — matérialise l'append-only en TS
  [`types.ts:51`](../../lib/supabase/types.ts#L51)
- `audit_log.Update: never` — idem
  [`types.ts:103`](../../lib/supabase/types.ts#L103)

**Documentation**

- Section "Database setup" — instructions copy/paste + workflow évolution
  [`README.md:53`](../../README.md#L53)

**Acceptance Criteria:**
- Given la migration appliquée via le SQL editor, when on inspecte le schéma via le dashboard, then les 4 tables existent avec leurs colonnes, contraintes, index, et RLS activée
- Given un utilisateur A authentifié, when il INSERT dans `accounts` avec son `auth.uid()`, then la row est créée
- Given un utilisateur A authentifié, when il SELECT * FROM accounts, then il ne voit QUE ses propres rows (RLS filtre les rows d'autres users)
- Given un utilisateur A authentifié, when il tente UPDATE sur `transactions`, then la requête retourne 0 rows affected (RLS deny)
- Given un INSERT dans `transactions` avec un `(user_id, account_id, hash)` déjà présent, then erreur Postgres `23505` (UNIQUE violation)
- Given la suppression d'un utilisateur via Supabase Auth → Users, when on inspecte les tables, then toutes ses rows liées (accounts, transactions, annotations, audit_log) ont été supprimées en cascade
- Given un re-run de la migration entière, then aucune erreur (idempotente via IF NOT EXISTS et DROP POLICY IF EXISTS)
- Given `npm run typecheck && npm run lint && npm run build`, then tout passe sans erreur ni warning. Les types `Database['public']['Tables']['accounts']` etc. sont importables depuis `lib/supabase/types.ts`

## Design Notes

**Pourquoi la séparation `transactions` / `transaction_annotations`** : c'est l'innovation #4 du PRD ("Architecture event-sourced consumer-grade"). Les facts (ce que la banque dit) ne sont jamais touchés ; tout le travail utilisateur (catégorisation, lettrage, commentaires) vit dans une table parallèle reliée 1-1 par FK. Le re-import d'un PDF déjà ingéré ne casse aucune annotation, et la fiabilité historique est garantie au niveau base.

**Pourquoi pas de CLI Supabase** : décision auteur de coller au flow simple (URL + anon + service_key dans `.env.local`). Trade-off : les types TypeScript doivent être maintenus à la main, et la sync schéma↔types est de la discipline. Pour un projet solo V1 avec 4 tables c'est négligeable. La structure `supabase/migrations/` est conservée comme convention versionnée — si l'auteur active le CLI plus tard, tout est déjà au bon endroit.

**Pourquoi `pro_perso` comme TEXT** : permet de distinguer 3 états (pro / perso / non classé). Plus expressif qu'un boolean nullable.

**Pourquoi denormaliser `user_id` sur `transaction_annotations`** : RLS direct et indexable, sans JOIN. Coût (sync à l'INSERT) mineur car les annotations sont créées par l'app, pas par le user directement.

**Pourquoi `op_date`** : `date` est sensible dans certains contextes Postgres ; préfixer évite les surprises.

**Idempotence de la migration** : `IF NOT EXISTS` partout + `DROP POLICY IF EXISTS` avant `CREATE POLICY`. Permet de relancer la migration en cas d'incident (ex: erreur en cours d'application laissant un état partiel) sans avoir à comprendre où on en était.

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 erreur après mise à jour de `types.ts`
- `npm run lint` -- expected: 0 warning
- `npm run build` -- expected: succès

**Manual checks (par l'auteur, dashboard Supabase) :**
- SQL editor → coller le contenu de `supabase/migrations/0001_init_schema.sql` → Run → aucune erreur
- Database → Tables : vérifier les 4 tables présentes (accounts, transactions, transaction_annotations, audit_log) avec colonnes correctes et RLS activée (icône cadenas)
- Database → Policies : vérifier les policies attendues sur chaque table
- SQL editor : exécuter `INSERT INTO accounts (name, user_id) VALUES ('test', auth.uid())` connecté en tant qu'auteur → row créée
- SQL editor : exécuter `UPDATE transactions SET amount = 0` (sans WHERE) → 0 rows affected (RLS deny)
- Authentication → Users : créer un user test, le supprimer, vérifier que ses rows liées sont parties (cascade)
- Re-run de la migration entière → aucune erreur (idempotence)
