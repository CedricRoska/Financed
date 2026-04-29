---
title: 'Foundation setup — Next.js 15 + Supabase wiring'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: 'ddca615'
context:
  - '_bmad-output/planning-artifacts/prd.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le projet Financed n'a aucun code applicatif (uniquement des artefacts de planification BMAD). Sans une fondation Next.js + Supabase opérationnelle, aucun goal ultérieur (auth, schéma, import CSV) ne peut démarrer.

**Approach:** Initialiser un projet Next.js 15 (App Router, TypeScript strict) avec Tailwind CSS, wirer les clients Supabase (browser + server via `@supabase/ssr`) dans une couche dédiée `lib/supabase/`, configurer ESLint et Prettier, et livrer une page d'accueil hello-world bootable qui affiche un statut de connexion Supabase basé sur la présence des variables d'environnement.

## Boundaries & Constraints

**Always:**
- Stack imposée : Next.js 15 (App Router), TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`), Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`
- Couche Supabase isolée dans `lib/supabase/` (NFR23 — migration possible vers self-hosted)
- `SUPABASE_SERVICE_KEY` jamais exposée côté client (NFR10) — uniquement importable depuis modules `lib/supabase/server.ts`
- ESLint et Prettier en mode strict, zéro warning toléré au build
- Tous les fichiers de configuration sont commentés pour expliquer les choix non-évidents
- Package manager : **npm** (zero-install, ships with Node)

**Ask First:**
- Si un autre package manager (pnpm, yarn) est requis par l'utilisateur, le préciser avant l'implémentation
- Si l'utilisateur veut shadcn/ui dès la foundation (par défaut : Tailwind seul, shadcn ajouté plus tard quand on aura des composants à construire)

**Never:**
- Pas de pages d'auth, de routes protégées, de middleware (Goal 2 différé)
- Pas de tables Postgres, de migrations, de RLS, de types générés (Goal 3 différé)
- Pas de composants métier (transactions, lettrage, etc.) (Goal 4+ différé)
- Pas de tests Vitest/Playwright (rien de testable encore — viendra avec Goal 2)
- Pas de styling custom hors Tailwind (pas de CSS-in-JS, pas de styled-components)
- Pas d'appel réel à Supabase au runtime de la page d'accueil — uniquement vérification des env vars

</frozen-after-approval>

## Code Map

- `package.json` -- dépendances Next.js + Supabase + scripts (`dev`, `build`, `lint`, `typecheck`)
- `tsconfig.json` -- TypeScript strict + paths alias `@/*`
- `next.config.ts` -- config Next.js (headers de sécurité optionnels, defaults sinon)
- `tailwind.config.ts` -- scope content `app/`, `components/`, `lib/`
- `postcss.config.mjs` -- PostCSS pour Tailwind
- `eslint.config.mjs` -- ESLint flat config (Next.js + TypeScript strict)
- `.prettierrc.json` -- Prettier config minimale
- `app/layout.tsx` -- root layout avec import `globals.css`, métadonnées (`title: Financed`)
- `app/page.tsx` -- page d'accueil hello-world + statut env Supabase (server component)
- `app/globals.css` -- directives Tailwind + reset
- `lib/supabase/client.ts` -- `createBrowserClient` du package `@supabase/ssr`
- `lib/supabase/server.ts` -- `createServerClient` cookies-aware + helper `createServiceClient` (server-only)
- `lib/supabase/types.ts` -- type `Database` stub (`= unknown`), à régénérer en Goal 3
- `README.md` -- instructions de setup (clone, install, env, dev)
- `.env.local` -- déjà rempli par l'utilisateur (3 vars), confirmé en pré-requis
- `.gitignore` -- déjà créé

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` -- créés manuellement (bootstrap équivalent à create-next-app, les fichiers existants `_bmad/`, `_bmad-output/`, `.claude/`, `.env.example`, `.env.local`, `.gitignore` préservés)
- [x] `package.json` -- dépendances `@supabase/supabase-js`, `@supabase/ssr`, `server-only` ajoutées
- [x] `package.json` -- scripts `typecheck` et `format` ajoutés
- [x] `tsconfig.json` -- `strict: true` + `noUncheckedIndexedAccess: true`
- [x] `.prettierrc.json` + `.prettierignore` -- créés
- [x] `lib/supabase/client.ts` -- `createBrowserClient` typé via `Database`
- [x] `lib/supabase/server.ts` -- `createServerClient` (cookies via `next/headers`) + `createServiceClient` + `isSupabaseConfigured` helper, marqué `'server-only'`
- [x] `lib/supabase/types.ts` -- stub `Database` exporté (à remplacer en Goal 3)
- [x] `app/page.tsx` -- server component avec titre "Financed", typo Tailwind premium, badge `✅ Supabase wired` / `⚠️ Supabase not configured` via `isSupabaseConfigured()` (NFR10 : nom de la var env localisé dans server.ts uniquement)
- [x] `app/layout.tsx` -- métadonnées `title: 'Financed'` + description
- [x] `README.md` -- pré-requis, setup, scripts, architecture, sécurité, roadmap

**Refactor pendant l'implémentation** : la version initiale de `app/page.tsx` lisait directement `process.env.SUPABASE_SERVICE_KEY`. Pour respecter strictement l'AC NFR10, la lecture a été déplacée dans `isSupabaseConfigured()` exposé par `lib/supabase/server.ts`. Le grep confirme que la chaîne `SUPABASE_SERVICE_KEY` n'apparaît plus que dans ce fichier.

**Acceptance Criteria:**
- Given un clone fresh du repo avec `.env.local` rempli, when l'utilisateur exécute `npm install && npm run dev`, then la page d'accueil charge sans erreur en moins de 5 s, affiche "Financed" et le badge `✅ Supabase wired`
- Given `npm run build`, then la production build réussit sans warning ni erreur
- Given `npm run typecheck`, then aucune erreur TypeScript
- Given `npm run lint`, then aucune erreur ni warning ESLint
- Given un grep récursif de `SUPABASE_SERVICE_KEY` dans les fichiers du repo (hors `.env*`, `_bmad-output/`, `node_modules/`), then la chaîne n'apparaît que dans `lib/supabase/server.ts` (NFR10 : la clé n'est jamais référencée par du code client)
- Given un build inspectable (`.next/static/`), when on cherche le contenu de `SUPABASE_SERVICE_KEY` ou la chaîne `service_role`, then aucune occurrence (la clé n'est pas leakée dans le bundle client)

## Design Notes

**Pourquoi `@supabase/ssr` plutôt que `@supabase/auth-helpers-nextjs`** : `auth-helpers-nextjs` est déprécié depuis 2024. Le package officiel `@supabase/ssr` est le successeur, supporte App Router nativement, et gère correctement les cookies en server components et route handlers.

**Pourquoi un stub `Database = { public: { Tables: Record<string, never> ... } }`** : permet aux clients Supabase d'être typés dès la foundation, sans table définie. Quand Goal 3 sera implémenté, `supabase gen types typescript` régénérera ce fichier avec le vrai schéma. Le stub évite les `any` qui contamineraient les call sites.

**Pourquoi `'server-only'` sur `lib/supabase/server.ts`** : ce package npm fait échouer le build Next.js si un fichier marqué `'server-only'` est importé depuis un client component. Garantit techniquement le NFR10.

**Boot sans appel Supabase réel** : la page d'accueil ne fait qu'inspecter `process.env`. Aucun fetch réseau. Cela permet de valider la foundation indépendamment du provisioning Supabase et garantit que l'app boot même si le projet Supabase est down.

## Verification

**Commands:**
- `npm install` -- expected: install sans erreur, lockfile créé
- `npm run typecheck` -- expected: 0 erreur TypeScript
- `npm run lint` -- expected: 0 erreur, 0 warning ESLint
- `npm run build` -- expected: build production réussit sans warning
- `npm run dev` -- expected: serveur démarre, http://localhost:3000 accessible
- `grep -r "SUPABASE_SERVICE_KEY" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=_bmad-output .` -- expected: une seule occurrence dans `lib/supabase/server.ts`

**Manual checks:**
- Ouvrir `http://localhost:3000`, vérifier titre "Financed" et badge `✅ Supabase wired`
- Inspecter DevTools → Network → premier document HTML : `SUPABASE_SERVICE_KEY` ne doit pas apparaître
- Inspecter DevTools → Sources → bundle JS : aucune occurrence de la clé service_role

## Suggested Review Order

**Application entry & UX validation**

- Server component qui rend le wow visuel et flag l'état de configuration
  [`page.tsx:1`](../../app/page.tsx#L1)

**Supabase wiring (NFR10 critique)**

- Marker `server-only` qui fait échouer le build si importé côté client
  [`server.ts:1`](../../lib/supabase/server.ts#L1)
- Lecture centralisée des 3 vars d'env — seul endroit où `SUPABASE_SERVICE_KEY` apparaît
  [`server.ts:46`](../../lib/supabase/server.ts#L46)
- Client admin service_role pour les opérations serveur de confiance (Goal 2+)
  [`server.ts:61`](../../lib/supabase/server.ts#L61)
- Client server-side cookies-aware pour les server components / route handlers
  [`server.ts:15`](../../lib/supabase/server.ts#L15)
- Client browser limité à anon — RLS protège
  [`client.ts:9`](../../lib/supabase/client.ts#L9)
- Stub `Database` typé, à régénérer en Goal 3 via `supabase gen types`
  [`types.ts:11`](../../lib/supabase/types.ts#L11)

**Type strictness & dépendances**

- TypeScript strict + `noUncheckedIndexedAccess` (renforce strict)
  [`tsconfig.json:11`](../../tsconfig.json#L11)
- Path alias `@/*` pour imports propres
  [`tsconfig.json:25`](../../tsconfig.json#L25)
- Dépendances Next 15 / React 19 / Supabase ssr / `server-only`
  [`package.json:13`](../../package.json#L13)

**Layout, styling, métadonnées**

- Root layout avec `lang="fr"` et description SEO
  [`layout.tsx:5`](../../app/layout.tsx#L5)
- Variables CSS + reset minimal + base Tailwind
  [`globals.css:1`](../../app/globals.css#L1)
- Scope content Tailwind (app, components, lib)
  [`tailwind.config.ts:5`](../../tailwind.config.ts#L5)

**Tooling & DX**

- ESLint flat config + ignores BMAD/Claude
  [`eslint.config.mjs:13`](../../eslint.config.mjs#L13)
- Prettier convention (no semi, single quote, 100 cols)
  [`.prettierrc.json:1`](../../.prettierrc.json#L1)

**Documentation**

- Setup, scripts, architecture, sécurité, roadmap
  [`README.md:1`](../../README.md#L1)
