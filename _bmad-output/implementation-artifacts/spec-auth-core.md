---
title: 'Auth core — Supabase Auth signup / login / logout / session'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: '08610b2'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-foundation-setup.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sans authentification, l'application ne peut pas isoler les données par utilisateur (RLS Postgres requiert `auth.uid()`) ni servir de base aux goals suivants (schéma, import, lettrage). FR1, FR2, FR3, FR5 du PRD doivent être couverts pour débloquer la suite.

**Approach:** Implémenter un flow auth email/password complet via Supabase Auth (déjà wiré en foundation) : pages `/login` et `/signup` (client components avec Server Actions pour soumettre), route handler `/logout`, page `/dashboard` placeholder protégée, middleware Next.js qui (a) rafraîchit la session sur chaque requête, (b) redirige les non-authentifiés vers `/login` sur les routes protégées, (c) redirige les authentifiés vers `/dashboard` depuis `/login` ou `/signup`.

## Boundaries & Constraints

**Always:**
- Auth uniquement par email + password (pas de magic link, pas d'OAuth en V1)
- Email confirmation **désactivée** côté Supabase (paramétrage manuel par l'utilisateur dans son dashboard, mentionné dans le README) pour permettre le signup → connection immédiat en dev
- Toutes les routes sous `/dashboard`, `/accounts` (futur), `/import` (futur) sont protégées par middleware
- Routes publiques : `/`, `/login`, `/signup`
- Server Actions Next.js pour la soumission des formulaires (pas de POST direct vers Supabase depuis le client) — garantit la mise à jour propre des cookies de session
- Erreurs auth (mauvais credentials, mot de passe trop court, email déjà utilisé) affichées clairement dans le formulaire
- FR1-FR5 traçabilité explicite dans le code (commentaires)

**Ask First:**
- Si l'utilisateur veut activer l'email confirmation dès V1 (impose un flow de callback `/auth/confirm` en plus)
- Si l'utilisateur veut un OAuth provider (Google, GitHub) — ajout possible mais hors scope V1

**Never:**
- Pas de récupération de mot de passe — déféré au spec `auth-password-reset` (FR4)
- Pas de OAuth providers en V1
- Pas de page profil / gestion compte avancée — Settings minimal en V1
- Pas de UI components réutilisables (Button, Input shadcn) — HTML + Tailwind brut
- Pas de schéma Postgres custom — Goal 3 différé. La table `auth.users` (managed Supabase) suffit
- Pas de tests E2E (V1.5)
- Pas d'usage du `service_role` client — toutes les opérations auth via le client server cookies-aware

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Signup happy path | email valide, password ≥ 6 chars | session créée, redirect vers `/dashboard` | N/A |
| Signup email déjà utilisé | email existant | reste sur `/signup`, message d'erreur clair | erreur Supabase mappée FR |
| Signup password trop court | password < 6 chars | reste sur `/signup`, message d'erreur clair | erreur Supabase mappée FR |
| Login happy path | credentials valides | session créée, redirect vers `/dashboard` | N/A |
| Login mauvais credentials | email/password incorrects | reste sur `/login`, message générique *"Identifiants invalides"* | erreur Supabase mappée FR |
| Logout | utilisateur authentifié clique logout | session purgée, redirect vers `/login` | N/A |
| Accès `/dashboard` sans session | utilisateur non authentifié | redirect 307 vers `/login` | N/A |
| Accès `/login` avec session | utilisateur déjà authentifié | redirect 307 vers `/dashboard` | N/A |
| Session expirée pendant nav | cookie expiré, requête vers `/dashboard` | middleware rafraîchit ou redirige `/login` | N/A |

</frozen-after-approval>

## Code Map

- `middleware.ts` -- middleware Next.js root, refresh session + protection routes
- `lib/supabase/middleware.ts` -- helper `updateSession` cookies-aware pour le middleware
- `app/login/page.tsx` -- formulaire login (client component) + Server Action
- `app/login/actions.ts` -- Server Action `login(formData)` qui appelle `supabase.auth.signInWithPassword`
- `app/signup/page.tsx` -- formulaire signup (client component) + Server Action
- `app/signup/actions.ts` -- Server Action `signup(formData)` qui appelle `supabase.auth.signUp`
- `app/logout/route.ts` -- POST handler qui appelle `supabase.auth.signOut` et redirige vers `/login`
- `app/dashboard/page.tsx` -- page protégée placeholder ; lit l'utilisateur via `supabase.auth.getUser()` et affiche son email
- `app/page.tsx` -- modifié : redirige vers `/dashboard` si authed, `/login` sinon
- `README.md` -- ajout section "Configuration Supabase Auth" (désactiver email confirmation)

## Tasks & Acceptance

**Execution:**
- [x] `lib/supabase/middleware.ts` -- `updateSession(request)` créé : client server cookies-aware, appelle `getUser()` pour refresh session, renvoie `{ supabaseResponse, user }`
- [x] `middleware.ts` -- root middleware créé : protège `/dashboard`, `/accounts`, `/import` ; redirige authed depuis `/login`, `/signup` vers `/dashboard` ; matcher exclut assets statiques
- [x] `app/login/page.tsx` -- formulaire premium (email/password, lien signup, message d'erreur via searchParams.error, mapping FR des erreurs)
- [x] `app/login/actions.ts` -- Server Action `login` : valide types, signInWithPassword, redirect `/dashboard` ou `/login?error=`
- [x] `app/signup/page.tsx` -- formulaire signup symétrique au login
- [x] `app/signup/actions.ts` -- Server Action `signup` : valide types + min 6 chars, signUp, mapping erreurs (`email-taken`, `signup-failed`)
- [x] `app/logout/route.ts` -- `POST` handler : signOut + redirect 303 `/login`
- [x] `app/dashboard/page.tsx` -- server component : `getUser()` (double-check après middleware), affiche email + bouton "Se déconnecter" (form POST `/logout`), placeholder pour features futures
- [x] `app/page.tsx` -- réécrit : server component qui redirige `/dashboard` (authed) ou `/login` (non-authed) via `getUser()`. Badge `Supabase wired` retiré (non pertinent post-auth)
- [x] `README.md` -- section setup mise à jour avec étape 4 obligatoire (désactiver email confirmation)

## Suggested Review Order

**Auth flow entry points & UX**

- Page d'entrée — redirige selon état auth
  [`page.tsx:1`](../../app/page.tsx#L1)
- Formulaire login premium + mapping FR des erreurs
  [`login/page.tsx:1`](../../app/login/page.tsx#L1)
- Formulaire signup avec validation min 6 chars
  [`signup/page.tsx:1`](../../app/signup/page.tsx#L1)
- Dashboard placeholder protégé + bouton logout
  [`dashboard/page.tsx:1`](../../app/dashboard/page.tsx#L1)

**Server Actions (FR1-FR3)**

- `login` Server Action — signInWithPassword + redirect erreurs
  [`login/actions.ts:9`](../../app/login/actions.ts#L9)
- `signup` Server Action — signUp + mapping email déjà utilisé
  [`signup/actions.ts:9`](../../app/signup/actions.ts#L9)
- `POST /logout` route handler — signOut + redirect 303
  [`logout/route.ts:11`](../../app/logout/route.ts#L11)

**Middleware & protection routes**

- Root middleware — refresh session + matrice de redirects
  [`middleware.ts:7`](../../middleware.ts#L7)
- Liste des préfixes protégés
  [`middleware.ts:4`](../../middleware.ts#L4)
- Helper `updateSession` cookies-aware (refresh JWT par requête)
  [`supabase/middleware.ts:16`](../../lib/supabase/middleware.ts#L16)
- Matcher exclut assets statiques pour ne pas spammer le middleware
  [`middleware.ts:33`](../../middleware.ts#L33)

**Documentation**

- Étape 4 setup — désactiver email confirmation
  [`README.md:30`](../../README.md#L30)

**Acceptance Criteria:**
- Given un visiteur non authentifié, when il navigue sur `/`, then il est redirigé vers `/login`
- Given un visiteur sur `/login`, when il soumet email + password valides via le formulaire, then une session est créée et il est redirigé vers `/dashboard` qui affiche son email
- Given un visiteur sur `/signup`, when il soumet un nouvel email + password (≥ 6 chars), then un compte est créé, une session est ouverte, et il est redirigé vers `/dashboard`
- Given un utilisateur authentifié sur `/dashboard`, when il clique le bouton logout, then sa session est purgée et il est redirigé vers `/login`
- Given un utilisateur authentifié, when il navigue manuellement vers `/login` ou `/signup`, then il est redirigé vers `/dashboard`
- Given des credentials incorrects sur `/login`, when soumission, then la page reste sur `/login` avec un message d'erreur visible
- Given `npm run typecheck && npm run lint && npm run build`, then tout passe sans erreur ni warning
- Given un grep `SUPABASE_SERVICE_KEY` (hors `.env*`, `_bmad-output/`, `node_modules/`, `*.md`), then la chaîne n'apparaît que dans `lib/supabase/server.ts` (NFR10 toujours respecté après ajout du middleware)

## Design Notes

**Pourquoi Server Actions plutôt qu'API routes** : Server Actions Next.js (App Router) gèrent automatiquement la mise à jour des cookies de session quand `supabase.auth.signInWithPassword` est appelé côté serveur. Les API routes nécessiteraient une plomberie cookies manuelle. Plus court, plus idiomatique.

**Pourquoi désactiver email confirmation en V1** : avec V1 = solo dev local, la confirmation par email ajoute un flow callback `/auth/confirm` sans valeur. À l'ouverture publique (V2), on réactivera et on implémentera le callback. Documenté dans le README pour que l'utilisateur le configure dans son dashboard Supabase.

**Pattern d'erreur via searchParams** : les Server Actions ne renvoient pas facilement des erreurs au formulaire client. Pattern simple : redirect vers `/login?error=invalid-credentials` et la page lit `searchParams.error`. Évite l'usage de `useFormState` / `useActionState` qui complexifient le V1.

**Middleware route matching** : la route racine `/` est traitée comme route publique au niveau middleware (pas de redirect forcé), mais le code de la page `/` fait son propre redirect via `getUser()`. Cela simplifie la matrice de protection middleware (juste `/dashboard` et futur `/accounts` `/import`).

## Verification

**Commands:**
- `npm install` -- expected: rien à ajouter (deps déjà installées en foundation)
- `npm run typecheck` -- expected: 0 erreur
- `npm run lint` -- expected: 0 erreur ni warning
- `npm run build` -- expected: build production réussit
- `npm run dev` -- expected: serveur démarre

**Manual checks:**
- Désactiver email confirmation dans Supabase dashboard avant test
- Aller sur http://localhost:3000 → redirect `/login`
- Cliquer "Créer un compte" → `/signup`, créer un compte test → redirect `/dashboard` avec email affiché
- Cliquer logout → redirect `/login`
- Login avec les credentials créés → redirect `/dashboard`
- Tenter `/dashboard` directement après logout → redirect `/login`
- Tenter `/login` étant authentifié → redirect `/dashboard`
- Tenter login avec mauvais password → reste sur `/login` avec message d'erreur visible
