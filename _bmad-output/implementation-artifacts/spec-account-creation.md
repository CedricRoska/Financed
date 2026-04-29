---
title: 'Account creation — UI dashboard + Server Action createAccount'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: '8c59701'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-schema-core.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dashboard est un placeholder qui affiche juste l'email. Pour progresser vers l'import CSV, l'utilisateur doit pouvoir créer son premier compte bancaire. C'est aussi le premier test E2E du schéma appliqué à Goal 3 (Server Action authentifiée → INSERT sous RLS → SELECT scopé).

**Approach:** Refactor `/dashboard` pour afficher la liste des comptes de l'utilisateur (avec état vide si aucun) + un formulaire inline de création (`name` + toggle `is_hybrid`). Server Action `createAccount` qui insère via le client server cookies-aware (RLS scope auto par `auth.uid()`). `revalidatePath` post-INSERT pour refresh la liste.

## Boundaries & Constraints

**Always:**
- Lecture des accounts via le client server cookies-aware (RLS s'applique automatiquement, l'utilisateur ne voit que ses comptes)
- INSERT via Server Action — pas de mutation client direct
- Le formulaire force `name` non vide (côté client + server) et `is_hybrid` boolean
- État vide premium et clair quand l'utilisateur n'a pas encore de compte (cohérent avec la doctrine "premium et clair")
- Une fois créés, les comptes sont triés par `created_at desc` (le plus récent en premier)
- Erreurs d'INSERT (RLS rejette, contrainte CHECK violée) affichées clairement à l'utilisateur via `?error=` dans l'URL (même pattern que login/signup)
- Liste cliquable : un compte affiché doit pointer vers `/accounts/[id]` (route à créer en stub minimal, sera étoffée au prochain spec — mais le lien doit exister maintenant pour cohérence UX)

**Ask First:**
- Si on doit ajouter un bouton "Modifier" / "Supprimer" dès maintenant (par défaut non, différé : focus sur la création + lecture pour valider l'E2E)

**Never:**
- Pas de modal complexe — formulaire inline simple
- Pas de validation côté client poussée (HTML5 required + minLength=1 suffit ; la vraie validation est côté DB via CHECK)
- Pas de page `/accounts` séparée pour la liste — la liste vit sur `/dashboard` (cohérent avec la "vue consolidée" du PRD)
- Pas d'édition / suppression — différé
- Pas de soft delete — quand on ajoutera la suppression plus tard, ce sera DELETE direct via la cascade
- Pas de pagination — un user a typiquement 1-5 comptes en V1

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| User authentifié sans compte | session valide | Dashboard affiche état vide + formulaire de création | N/A |
| Création compte happy path | name="Banque Pop", is_hybrid=false | Row créée, dashboard refreshe, le compte apparaît en haut de la liste | N/A |
| Création compte hybride | name="Mixte Pro/Perso", is_hybrid=true | Row créée avec `is_hybrid=true`, badge "Pro/Perso" affiché sur le compte | N/A |
| Création avec name vide | submit avec name="" | Refus côté client (HTML required) | N/A |
| Création avec name >100 chars | submit avec name long | DB CHECK rejette → redirect `?error=invalid-name` | erreur capturée |
| User authentifié avec N comptes | session valide, N rows en base | Dashboard liste les N comptes, formulaire reste visible pour ajout | N/A |
| Tentative création sans session | Server Action appelée hors session | RLS rejette ou redirect /login | erreur |

</frozen-after-approval>

## Code Map

- `app/dashboard/page.tsx` -- réécrit : fetch accounts via Supabase, layout avec header (email + logout) + section "Mes comptes" (liste + formulaire inline)
- `app/dashboard/actions.ts` -- nouveau : Server Action `createAccount(formData)` qui valide, insère, revalidate
- `app/accounts/[id]/page.tsx` -- nouveau : stub minimal qui affiche le nom du compte (sera étoffé au prochain spec)

## Tasks & Acceptance

**Execution:**
- [x] `app/dashboard/actions.ts` -- Server Action `createAccount(formData)` créée : valide `name` (1-100 chars trimmed), insert avec `user.id` via `getUser()`, redirect erreurs ou `revalidatePath('/dashboard')`
- [x] `app/dashboard/page.tsx` -- réécrit : fetch accounts triés `created_at desc`, header email+logout, liste premium avec badge "Pro / Perso" sur hybrides + date FR, état vide premium si aucun compte, formulaire inline (name + checkbox is_hybrid + bouton), erreurs via searchParams
- [x] `app/accounts/[id]/page.tsx` -- stub créé : `maybeSingle()` sur `accounts` par id, redirect `/dashboard` si non trouvé (cohérent RLS, pas de 404 qui leak l'existence), affichage nom + badge + placeholder pour les features à venir
- [x] **Patch upstream-driven** : cast `as unknown as SupabaseClient<Database>` dans `lib/supabase/server.ts` et `lib/supabase/client.ts`. Bug de typage @supabase/ssr 0.6.1 où `createServerClient<Database>` retourne `SupabaseClient<Database, SchemaName, Schema>` avec les params dans le mauvais ordre par rapport à la signature interne de `SupabaseClient`, faisant résoudre `Schema` en `never`. Le cast force la résolution correcte. Commentaire de documentation inline pour retirer le cast quand upstream sera fixé.

## Suggested Review Order

**Server Action & RLS validation E2E**

- `createAccount` Server Action — getUser puis INSERT scopé
  [`actions.ts:11`](../../app/dashboard/actions.ts#L11)
- Validation côté serveur (name non vide, ≤ 100 chars)
  [`actions.ts:14`](../../app/dashboard/actions.ts#L14)

**Dashboard page (refactor)**

- Layout principal + state management via searchParams
  [`page.tsx:43`](../../app/dashboard/page.tsx#L43)
- Liste premium avec badge Pro/Perso et date FR
  [`page.tsx:62`](../../app/dashboard/page.tsx#L62)
- État vide premium si aucun compte
  [`page.tsx:88`](../../app/dashboard/page.tsx#L88)
- Formulaire inline avec checkbox hybride
  [`page.tsx:103`](../../app/dashboard/page.tsx#L103)

**Account detail stub**

- Lookup `maybeSingle()` + redirect propre via RLS
  [`accounts/[id]/page.tsx:13`](../../app/accounts/[id]/page.tsx#L13)
- Pas de 404 explicite pour ne pas révéler l'existence
  [`accounts/[id]/page.tsx:23`](../../app/accounts/[id]/page.tsx#L23)

**Workaround typage Supabase**

- Cast SupabaseClient<Database> côté server
  [`supabase/server.ts:20`](../../lib/supabase/server.ts#L20)
- Cast SupabaseClient<Database> côté browser
  [`supabase/client.ts:12`](../../lib/supabase/client.ts#L12)
- Types Database avec Relationships explicites
  [`supabase/types.ts:18`](../../lib/supabase/types.ts#L18)

**Acceptance Criteria:**
- Given un user authentifié avec aucun compte, when il visite `/dashboard`, then il voit l'état vide + le formulaire de création
- Given un user authentifié, when il soumet le formulaire avec un name valide et `is_hybrid=true`, then un compte est créé en base avec son `auth.uid()` comme `user_id` et `is_hybrid=true`, et la liste se refreshe pour afficher la nouvelle entrée
- Given un user authentifié, when il soumet avec un name vide, then le formulaire bloque côté client (HTML5 required) et aucune requête n'est envoyée
- Given un user authentifié avec ≥ 1 compte, when il visite `/dashboard`, then la liste affiche ses comptes triés par création desc, avec badge "Pro/Perso" sur les hybrides
- Given un user A authentifié, when il tente d'accéder à `/accounts/[id]` d'un compte appartenant à user B, then RLS retourne 0 rows et le stub redirige vers `/dashboard`
- Given `npm run typecheck && npm run lint && npm run build`, then tout passe sans erreur ni warning
- Given le grep NFR10, then `SUPABASE_SERVICE_KEY` reste uniquement dans `lib/supabase/server.ts`

## Design Notes

**Pourquoi pas de redirect post-INSERT** : `revalidatePath('/dashboard')` suffit pour refresh la liste, et garde l'utilisateur sur dashboard pour qu'il puisse en ajouter d'autres rapidement. Plus fluide qu'un redirect.

**Pourquoi `created_at desc`** : l'utilisateur voit immédiatement le dernier compte qu'il vient de créer en haut. UX naturelle.

**Pourquoi un stub `/accounts/[id]`** : la liste de comptes doit être cliquable pour rester cohérente UX, même si le détail n'est pas encore implémenté. Un lien mort frustre. Le stub permet de valider que les routes protégées par middleware fonctionnent et que les RLS scope bien par utilisateur.

**Pourquoi pas de validation poussée** : HTML5 required + DB CHECK constraint suffisent. La validation custom (regex, longueur) est de l'overengineering pour V1 solo. La doctrine "the app reflects, doesn't lie" implique : on rejette ce que la DB rejette, on ne mime pas la validation.

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 erreur
- `npm run lint` -- expected: 0 warning
- `npm run build` -- expected: succès

**Manual checks (après que la migration Goal 3 soit appliquée) :**
- Démarrer `npm run dev`, login, aller sur `/dashboard` → état vide + formulaire visible
- Soumettre name="Banque Pop" sans cocher hybrid → entrée apparaît dans la liste
- Soumettre name="Mixte" en cochant hybrid → entrée apparaît avec badge "Pro/Perso"
- Cliquer sur un compte → page `/accounts/[id]` affiche le nom (stub)
- Tenter `/accounts/<UUID-aléatoire>` → redirige vers `/dashboard` (account non trouvé, RLS)

⚠️ Si la migration Goal 3 n'a pas encore été appliquée par l'auteur, le code compile et build OK, mais les manual checks runtime échoueront (les tables n'existent pas). L'auteur doit appliquer la migration avant les tests runtime.
