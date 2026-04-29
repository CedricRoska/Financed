---
title: 'Import CSV — parsing Banque Populaire + sanity check + dédup + preview + commit'
type: 'feature'
created: '2026-04-29'
status: 'done'
baseline_commit: '6c8874a'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/implementation-artifacts/spec-schema-core.md'
  - '_bmad-output/implementation-artifacts/spec-account-creation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'utilisateur a créé un compte mais ne peut pas y attacher de transactions. Sans import, le moteur ne contient aucune donnée à catégoriser, lettrer, ou afficher en vue mensuelle. C'est la porte d'entrée des données et le test critique de la chaîne fact-immutables → annotation-mutables.

**Approach:** Pour un compte donné (`/accounts/[id]/import`), permettre l'upload d'un fichier CSV exporté depuis Banque Populaire. Parser côté client avec Papa Parse, normaliser les colonnes vers la structure interne, calculer un hash sha256 par transaction, vérifier l'intégrité interne (no doublons intra-fichier), interroger la DB pour la dédup cross-fichier, présenter un preview à l'utilisateur, et sur confirmation insérer les nouvelles transactions + un entry `audit_log`.

## Boundaries & Constraints

**Always:**
- Format supporté V1 : **CSV Banque Populaire uniquement**. Séparateur `;`, encoding UTF-8 (BOM toléré). Colonnes attendues : `Date opération`, `Date valeur`, `Libellé`, `Débit euros`, `Crédit euros` (matching tolérant casse/accents)
- Parsing côté client (Papa Parse) — pas d'upload de fichier au serveur (économie bande passante + privacy)
- Hash transaction : `sha256(op_date + '|' + amount.toFixed(2) + '|' + normalizeLabel(raw_label))` où `normalizeLabel` = uppercase + trim + collapse whitespace
- Préview obligatoire avant commit (FR16) : table des transactions extraites avec statut "Nouvelle" ou "Doublon (déjà importée)" par ligne
- Sanity check : (1) toutes les lignes parsent (date valide, montant numérique), (2) aucun doublon de hash à l'intérieur du fichier, (3) résumé : nb total / nb nouvelles / nb doublons / sum_amount
- Dédup cross-fichier : query `transactions` filtrée par `(user_id, account_id, hash IN [...])`, marquage côté preview
- Commit : INSERT batch des nouvelles uniquement (jamais les doublons), wrapping dans une seule transaction Postgres si possible (via supabase-js), + entry `audit_log` (action='import_csv', metadata={accountId, total, inserted, duplicates, fileName})
- Erreurs de parsing affichées clairement avec ligne fautive et raison
- Bouton "Annuler" disponible à l'étape preview pour repartir de zéro

**Ask First:**
- Si le fichier contient des transactions sans `Date valeur` ou avec `Date opération` future (cas marginal en pratique mais possible)

**Never:**
- Pas de support Excel XLSX (différé)
- Pas de support multi-banques (différé)
- Pas de mapping manuel des colonnes (FR18 différé)
- Pas de vérification du solde bancaire (bank balance check différé — risqué car Banque Populaire ne fournit pas toujours le solde dans le CSV)
- Pas de gestion d'encodings exotiques (ISO-8859-1, etc.) — UTF-8 (BOM toléré) seulement
- Pas d'auto-catégorisation ni LLM en V1 (différé V1.5)
- Pas de support pour des fichiers > 10 000 lignes (cas limite pour V1)
- Pas de drag & drop multi-fichier — un fichier à la fois

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Import CSV propre, aucun doublon | 150 lignes valides | Preview affiche 150 nouvelles, click confirm → 150 INSERT + audit | N/A |
| Import CSV avec doublons cross-fichier | 50 lignes dont 10 déjà en DB | Preview : 40 nouvelles, 10 doublons (statut visible) ; commit insère 40 | N/A |
| Import CSV avec doublons intra-fichier | 100 lignes dont 5 dupliquées dans le même fichier | Sanity check rejette : "5 doublons internes détectés" + lignes affichées | bloquant |
| CSV mal formé | Pas de header / colonnes manquantes | Erreur "Colonnes Banque Populaire non détectées" | bloquant |
| Ligne avec date invalide | "31/02/2026" | Erreur "Ligne 47 : date invalide" | bloquant |
| Ligne avec montant non numérique | Débit="abc" | Erreur "Ligne 47 : montant invalide" | bloquant |
| Fichier vide ou 0 transaction utile | Header seul | "Aucune transaction trouvée dans le fichier" | bloquant |
| Annulation au preview | User clique Annuler | Retour à l'écran upload, état réinitialisé | N/A |
| Fichier > 10 000 lignes | Trop gros | "Fichier trop volumineux (max 10 000 lignes en V1)" | bloquant |

</frozen-after-approval>

## Code Map

- `package.json` -- ajouter `papaparse` (^5.4) + `@types/papaparse`
- `lib/import/types.ts` -- types partagés : `ParsedTransaction`, `ImportPreview`, `ImportError`
- `lib/import/normalize-banque-populaire.ts` -- mapping colonnes BP + détection format + parsing date FR + parsing montant
- `lib/import/hash.ts` -- `computeTransactionHash(opDate, amount, rawLabel)` → sha256 hex via `crypto.subtle` (Web Crypto, dispo client + server)
- `lib/import/parse-csv.ts` -- `parseCSV(file: File): Promise<ParsedTransaction[] | ImportError>` côté client
- `app/accounts/[id]/import/page.tsx` -- client component (`'use client'`) avec 3 états : upload / preview / success
- `app/accounts/[id]/import/actions.ts` -- Server Actions `previewImport(transactions, accountId)` (dédup query) + `commitImport(transactions, accountId, fileName)` (INSERT batch + audit_log)
- `app/accounts/[id]/page.tsx` -- ajouter bouton "Importer un relevé" pointant vers `/accounts/[id]/import`

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `papaparse` ^5.4 + `@types/papaparse` ^5.3 ajoutés, `npm install` exécuté
- [x] `lib/import/types.ts` -- types `ParsedTransaction`, `ImportError`, `PreviewedTransaction`, `ImportPreview`, `CommitResult` exportés
- [x] `lib/import/hash.ts` -- `computeTransactionHash` via Web Crypto + `normalizeLabel` exporté
- [x] `lib/import/normalize-banque-populaire.ts` -- matching tolérant des colonnes (NFD + lowercase + alphanum), parse date FR, parse montant FR (virgule + espace de millier), gestion débit/crédit signé
- [x] `lib/import/parse-csv.ts` -- pipeline complet : Papa Parse + normalisation + hash + dédup intra-fichier + détection lignes vides + limite 10k
- [x] `app/accounts/[id]/import/actions.ts` -- Server Actions `previewImport` (dédup query) et `commitImport` (INSERT batch + audit_log) avec validation ownership account
- [x] `app/accounts/[id]/import/page.tsx` -- client page state machine 5 phases (upload / parsing / preview / committing / success), drag & drop, table preview premium avec stats et badges Nouvelle/Doublon, bouton désactivé si 0 nouvelles
- [x] `app/accounts/[id]/page.tsx` -- bouton "Importer un relevé" ajouté en header

## Suggested Review Order

**Pipeline d'import (cœur du spec)**

- Parser CSV : Papa + normalisation + dédup intra-fichier
  [`parse-csv.ts:21`](../../lib/import/parse-csv.ts#L21)
- Normalisation Banque Populaire : matching colonnes, dates FR, montants FR
  [`normalize-banque-populaire.ts:80`](../../lib/import/normalize-banque-populaire.ts#L80)
- Hash sha256 via Web Crypto + normalize label
  [`hash.ts:17`](../../lib/import/hash.ts#L17)

**Server Actions (sécurité + DB)**

- `previewImport` : ownership check + dédup query
  [`actions.ts:34`](../../app/accounts/[id]/import/actions.ts#L34)
- `commitImport` : INSERT batch + audit_log
  [`actions.ts:78`](../../app/accounts/[id]/import/actions.ts#L78)
- Helper `ensureAccountOwnership` : double-check RLS
  [`actions.ts:14`](../../app/accounts/[id]/import/actions.ts#L14)

**UI client**

- State machine 5 phases
  [`import/page.tsx:11`](../../app/accounts/[id]/import/page.tsx#L11)
- Drag & drop tolérant
  [`import/page.tsx:131`](../../app/accounts/[id]/import/page.tsx#L131)
- Preview table avec stats et badges
  [`import/page.tsx:182`](../../app/accounts/[id]/import/page.tsx#L182)

**Navigation**

- Bouton "Importer un relevé" sur la page compte
  [`accounts/[id]/page.tsx:55`](../../app/accounts/[id]/page.tsx#L55)

**Acceptance Criteria:**
- Given un user avec un compte, when il visite `/accounts/[id]/import` et upload un CSV BP de N lignes valides sans doublon, then preview affiche N "Nouvelles" + résumé total/nouvelles/doublons cohérent
- Given un preview affiché, when l'user confirme, then les N transactions sont insérées en `transactions` avec leurs hashes, et un entry `audit_log` est créé avec metadata cohérente
- Given le même fichier ré-importé, then preview affiche N "Doublons" + 0 "Nouvelle", confirm est désactivé ou n'insère rien
- Given un fichier avec une ligne au montant non parsable, then erreur clairement affichée avec n° de ligne, aucune transaction insérée
- Given un fichier avec doublons internes, then erreur "X doublons internes détectés" bloquante
- Given un fichier > 10 000 lignes, then erreur "Fichier trop volumineux"
- Given `npm run typecheck && npm run lint && npm run build`, then tout passe sans erreur
- Given le grep NFR10, then `SUPABASE_SERVICE_KEY` reste uniquement dans `lib/supabase/server.ts`

## Design Notes

**Pourquoi parsing client-side** : (1) pas d'upload de fichier sensible, (2) UX instant feedback, (3) Server Actions reçoivent un payload typé propre (array de transactions) plutôt qu'un fichier binaire à reparser.

**Pourquoi Web Crypto pour hash** : `crypto.subtle.digest` est dispo natif en navigateur ET en Node ≥ 16, donc pas de dépendance npm pour SHA-256. Cohérent avec la doctrine "pas de dépendances inutiles".

**Pourquoi 1 audit_log entry par import (et non par transaction)** : un import est un événement utilisateur (un fichier, un timestamp). Chaque transaction n'a pas besoin d'audit individuel (les transactions sont déjà l'event source). Le metadata jsonb capture les détails (nb inserted, nb duplicates).

**Pourquoi confirmer côté serveur même si le preview est côté client** : double-validation. Le client peut être altéré ; le serveur ré-vérifie l'ownership de l'account et la dédup. Le hash est recalculé côté serveur ? Non : il est passé dans le payload, mais le serveur peut faire confiance car il n'est jamais utilisé pour bypasser RLS (les RLS protègent). Cohérent avec doctrine "the app reflects".

**Format Banque Populaire — colonnes attendues** : "Date opération" ; "Date valeur" ; "Libellé" ; "Débit euros" ; "Crédit euros" ; "Solde". Header sur ligne 1. Lignes de données suivantes. Parfois lignes vides ou commentaires en début. Papa Parse en mode `header: true` skip header ; on doit filtrer les lignes vides post-parse.

## Verification

**Commands:**
- `npm install` -- ajoute papaparse + types
- `npm run typecheck` -- 0 erreur
- `npm run lint` -- 0 warning
- `npm run build` -- succès

**Manual checks (après tout coding) :**
- Récupérer un CSV Banque Populaire réel
- Visiter `/accounts/[id]/import`, uploader → preview → confirmer
- Vérifier dans Supabase dashboard : rows insérées dans `transactions` + 1 entry dans `audit_log`
- Re-importer le même fichier → preview affiche "doublons" partout, commit n'insère rien
- Tester un CSV malformé (header altéré) → erreur claire
