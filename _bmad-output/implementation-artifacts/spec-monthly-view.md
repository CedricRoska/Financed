---
title: 'Monthly view — cards par mois sur compte + page détail mois'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: '4fa2fd1'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-import-csv.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une fois des transactions importées, l'utilisateur n'a aucun moyen de les voir. La page `/accounts/[id]` est un placeholder. Il faut matérialiser la première vue de lecture des données : cards mensuelles avec score + détail mois.

**Approach:** Refactor `/accounts/[id]` pour fetcher toutes les transactions du compte, les grouper par mois (YYYY-MM), et afficher pour chaque mois une card avec : nombre de transactions, compteur "non lettrées", score tricolore (somme des montants ≥ 0 = vert, < 0 = rouge). Chaque card est cliquable vers `/accounts/[id]/months/[YYYY-MM]` qui affiche la table des transactions du mois.

## Boundaries & Constraints

**Always:**
- Fetch transactions via le client server (RLS scope par `auth.uid()`)
- Groupement en mémoire côté Next.js (volume raisonnable V1, pas besoin d'optim Postgres)
- Score tricolore : math pure (sum), pas de LLM (NFR34)
- Compteur "non lettrées" V1 : égal au total (les annotations arrivent en Goal 4d, le compteur se raffinera quand catégorisation sera implémentée)
- Mois triés `desc` (le plus récent en haut)
- Format mois affiché en FR : "Avril 2026", "Mars 2026"
- Devise EUR partout (NFR du PRD : mono-devise)

**Ask First:**
- Pas applicable (scope clair)

**Never:**
- Pas de tabs Pro/Perso pour V1 (différé à Goal 4e après catégorisation)
- Pas de filtres / recherche dans la liste mensuelle (différé)
- Pas de pagination (V1 < 1000 transactions/compte typique)
- Pas de graphiques / charts (différé V1.5)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compte vide | 0 transactions | Page compte affiche état vide ("Importe ton premier relevé") + bouton import | N/A |
| Compte avec transactions | N transactions sur 3 mois | 3 cards triées desc, chacune avec stats du mois | N/A |
| URL mois inexistant | `/accounts/x/months/2099-12` (pas de transactions) | Affiche "Aucune transaction pour ce mois" + retour vers compte | N/A |
| URL mois mal formé | `/accounts/x/months/abc` | Redirect vers compte (parse échoue) | N/A |
| URL mois pour compte d'un autre user | RLS filtre les transactions | Affiche "Aucune transaction" (cohérent avec doctrine no-leak) | N/A |

</frozen-after-approval>

## Code Map

- `lib/months/format.ts` -- helpers : `formatMonthLabelFR`, `parseMonthSlug`, `groupTransactionsByMonth`, `monthScore`
- `app/accounts/[id]/page.tsx` -- refactor : fetch transactions, regroupe par mois, affiche cards
- `app/accounts/[id]/months/[month]/page.tsx` -- NEW : table des transactions du mois

## Tasks & Acceptance

**Execution:**
- [x] `lib/months/format.ts` -- helpers utilitaires (cf code map)
- [x] `app/accounts/[id]/page.tsx` -- refactor avec cards mensuelles + état vide
- [x] `app/accounts/[id]/months/[month]/page.tsx` -- nouvelle page

**Acceptance Criteria:**
- Given un compte vide, when on visite `/accounts/[id]`, then état vide visible avec bouton import
- Given un compte avec 50 transactions sur Avril/Mars/Février 2026, when on visite, then 3 cards triées desc avec stats correctes (count, score, non-lettrées)
- Given une card "Avril 2026" avec score positif, when on inspecte, then badge vert
- Given un click sur "Avril 2026", when la page de détail charge, then table des transactions de ce mois triées par date desc
- Given `npm run typecheck && npm run lint && npm run build`, then tout passe sans erreur

## Verification

**Commands:**
- `npm run typecheck` -- 0 erreur
- `npm run lint` -- 0 warning
- `npm run build` -- succès, route `/accounts/[id]/months/[month]` listée
