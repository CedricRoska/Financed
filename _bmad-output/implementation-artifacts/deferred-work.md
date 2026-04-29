# Deferred Work

Goals identified during quick-dev intent clarification but deferred to subsequent specs to respect single-goal scope.

## 2026-04-29 — Initial split during foundation setup spec

Source intent: *"Setup Next.js + Supabase + Auth + schéma initial des tables transactions et transaction_annotations avec RLS"*

### Goal 2 — Auth flow (split en 2 specs)

**Goal 2a — Auth core** *(implémenté dans `spec-auth-core.md`)* : signup, login, logout, session, middleware. **FRs couverts** : FR1, FR2, FR3, FR5.

**Goal 2b — Password reset** *(différé)* : pages `/forgot-password` et `/reset-password`, callback email, flow Supabase reset. **FR couvert** : FR4. À implémenter quand un parcours de récupération devient nécessaire (typiquement à l'ouverture publique V2).

**Dépendances** : Goal 1 (foundation) shipé. Goal 2b dépend de Goal 2a.

**NFRs touchés** : NFR9 (RLS), NFR10 (service_role server-side only)

### Goal 3 — Schéma initial Postgres

**Scope** : Migration Supabase créant les tables `users` (auto Supabase), `accounts`, `transactions` (RLS deny UPDATE), `transaction_annotations`, `categories`, `imports`, `audit_log`. Policies RLS sur toutes les tables. Index hash sur `transactions(user_id, hash)` pour détection doublons. Génération des types TypeScript via `supabase gen types typescript`.

**Dépendances** : Goal 1 (Supabase wiring) doit être shipé d'abord. Peut être implémenté en parallèle de Goal 2.

**FRs couverts** : FR15 (hash doublons), FR53 (immuabilité transactions), FR54 (RLS isolation), NFR9, NFR13, NFR14

### Goal 4 (post-foundation) — Premier import CSV

**Scope** : Composant drag & drop, parsing CSV via Papa Parse, normalisation colonnes Banque Populaire, sanity check somme, détection doublons, écriture en `transactions` + `audit_log`.

**Dépendances** : Goal 1 + Goal 3 (schéma) requis. Goal 2 (auth) recommandé (sinon import sans utilisateur).

**FRs couverts** : FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18
