---
title: 'Categorization — annotation form (category / comment / pro_perso / expected refund)'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: '3e85993'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-monthly-view.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les transactions sont importées et listées par mois, mais l'utilisateur ne peut ni les catégoriser, ni les commenter, ni marquer de remboursement attendu. Sans annotations, le moteur de lettrage et le compteur "non lettrées" sont inertes.

**Approach:** Page d'édition par transaction (`/accounts/[id]/transactions/[tid]/edit`) avec un formulaire de Server Action qui UPSERT dans `transaction_annotations`. Champs : `category` (text + datalist de suggestions FR hardcodées), `comment` (textarea), `pro_perso` (radio, visible uniquement si `accounts.is_hybrid`), `expected_refund_from` + `expected_refund_label` (FR37). Le détail mois rend les rows cliquables vers cette page et affiche un badge catégorie + couleur "non lettrée" tant qu'aucune annotation n'existe (ou que `expected_refund_from` est set).

## Boundaries & Constraints

**Always:**
- Fetch transaction + annotation via nested select Supabase (`transaction_annotations(...)`)
- UPSERT via `.upsert()` sur `transaction_annotations` avec `onConflict: 'transaction_id'` — la table a UNIQUE FK → 1-1
- Définition "non lettrée" V1 : pas d'annotation OU annotation avec `expected_refund_from` non vide (cohérent avec PRD : remboursement attendu reste non lettré jusqu'au lettrage)
- Catégories suggérées hardcodées en FR (Loyer, Courses, Transports, Restaurants, Abonnements, Salaire, Remboursements amis, Investissements, Vacances, Santé, Cadeaux, Autres) — affichées en `<datalist>` pour l'autocomplétion
- pro_perso visible uniquement sur compte hybride (FR7 cohérent)
- Empty string traité comme `null` à la sauvegarde
- Validation côté client (HTML5 maxLength) + côté server (sanity)
- Après save : redirect vers la page détail du mois de la transaction (`/accounts/[id]/months/[YYYY-MM]`)

**Ask First:**
- Pas applicable

**Never:**
- Pas de table `categories` (différé)
- Pas de seed de catégories (différé)
- Pas de tags personnalisés (FR33 différé V1.5)
- Pas de récurrent/ponctuel cocher (FR34 différé V1.5)
- Pas de bulk edit (différé)
- Pas de drag & drop catégorisation (différé)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Première catégorisation d'une transaction | aucune annotation existante | INSERT row dans transaction_annotations, redirect vers mois | N/A |
| Modification d'une catégorisation existante | annotation existe | UPDATE via upsert, redirect | N/A |
| Suppression catégorie (vider le champ) | category="" | UPDATE category=NULL, transaction redevient non lettrée | N/A |
| Marquage remboursement attendu | expected_refund_from="Paul", label="Bretagne 2026" | INSERT/UPDATE, transaction reste non lettrée même si category set | N/A |
| Editer une transaction d'un autre user | tentative cross-user | RLS rejette + redirect dashboard | N/A |
| Compte non hybride | account.is_hybrid=false | radio pro_perso non affichée | N/A |

</frozen-after-approval>

## Code Map

- `lib/categories/defaults.ts` -- liste hardcodée des catégories suggérées
- `lib/months/format.ts` -- ajouter `hasAnnotation` flag dans le grouping (transaction "non lettrée" si pas d'annotation OU annotation avec expected_refund_from)
- `app/accounts/[id]/months/[month]/page.tsx` -- fetch transactions WITH annotations, rendre les rows cliquables, afficher badge catégorie / non-lettrée
- `app/accounts/[id]/page.tsx` -- même fetch enrichi pour calculer correctement `unreconciled`
- `app/accounts/[id]/transactions/[tid]/edit/page.tsx` -- page edit avec form
- `app/accounts/[id]/transactions/[tid]/edit/actions.ts` -- Server Action `saveAnnotation`

## Tasks & Acceptance

**Execution:**
- [x] `lib/categories/defaults.ts` -- export `DEFAULT_CATEGORY_SUGGESTIONS`
- [x] `lib/months/format.ts` -- enrichir le typage `MinTransactionForGrouping` (déjà compatible) et ajouter `transactionIsUnreconciled` helper
- [x] `app/accounts/[id]/transactions/[tid]/edit/actions.ts` -- Server Action `saveAnnotation` (UPSERT)
- [x] `app/accounts/[id]/transactions/[tid]/edit/page.tsx` -- form premium + redirection
- [x] `app/accounts/[id]/months/[month]/page.tsx` -- nested select annotations + rows cliquables + badges catégo/non-lettrée
- [x] `app/accounts/[id]/page.tsx` -- enrichir le fetch pour stats correctes

**Acceptance Criteria:**
- Given un user clique sur une transaction sans annotation, when il saisit "Courses" et save, then annotation insérée, redirect vers mois, badge "Courses" visible sur la row
- Given un compte hybride, when on édite, then radio pro_perso visible ; sur compte non hybride, masquée
- Given une transaction marquée `expected_refund_from="Paul"`, then même catégorisée, elle reste comptée "non lettrée" sur la card mensuelle
- Given on vide le champ category puis save, then la catégorie redevient nulle (transaction redevient non lettrée si pas d'expected_refund)
- Given typecheck / lint / build, then OK

## Verification

**Commands:**
- `npm run typecheck` — 0 erreur
- `npm run lint` — 0 warning
- `npm run build` — succès, route `/accounts/[id]/transactions/[tid]/edit` listée
