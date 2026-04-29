---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowCompleted: true
completedDate: '2026-04-29'
releaseMode: 'phased'
importStrategy: 'MVP V1 : import CSV/Excel universel (parser tabulaire + normalisation par banque). Couvre 100% des banques classiques + neobanques françaises. Effort dev faible. V1.5 : ajout de l''import PDF Banque Populaire (déterministe) + fallback LLM-vision pour les autres PDF. V2+ : parsers PDF supplémentaires selon volume utilisateur.'
priorityBankV1: 'Banque Populaire (banque réelle de l''auteur)'
openArchitecturalDecisions:
  - 'PDF parsing strategy V1: à arbitrer en step 5 (Domain Requirements). Options: parser déterministe par banque / parser LLM-vision dès MVP (violation partielle doctrine) / hybride best-effort déterministe + sanity check forçant correction manuelle.'
businessModel: 'Free unlimited (V1 - no monetization)'
deploymentModel: 'Cloud-first via Supabase. Stack V1 : Next.js + React + Supabase (Postgres + Auth). Hébergement V1 : dev local uniquement (npm run dev), pas de prod hosting public. LLM (V1.5) : appels Anthropic relayés par les API routes Next.js, clé stockée côté serveur. V1 = usage personnel auteur, multi-device dès le départ via Supabase. Vercel sera ajouté quand l''auteur voudra ouvrir l''app à d''autres utilisateurs.'
techStack:
  framework: 'Next.js (App Router)'
  ui: 'React + TypeScript + Tailwind CSS'
  database: 'Supabase (Postgres + Auth + RLS)'
  pdfParsing: 'PDF.js (Mozilla) — V1 déterministe Banque Populaire ; V1.5 fallback LLM-vision'
  llm: 'Anthropic Claude Sonnet 4.6 via Next.js API routes (clé en env var server-side)'
  deployment: 'V1 : dev local. Vercel possible quand prêt à ouvrir.'
  vcs: 'GitHub'
primaryPersonas: ['Léa (freelance pro/perso)', 'Sophie (jeunes actifs)', 'Marc (couple multi-comptes)']
v1User: 'Cedric (dev for self-use, validation perso de la doctrine et du moteur de lettrage avant ouverture éventuelle à d''autres utilisateurs)'
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-04-28-224812.md'
workflowType: 'prd'
classification:
  projectType: 'web_app'
  domain: 'fintech'
  complexity: 'high'
  projectContext: 'greenfield'
  scopeNotes: 'Fintech-adjacent : pas de connexion bancaire, pas de paiement, pas de KYC/AML, pas de crypto. Pas d''app mobile (web-only même en V2+). Concerns réglementaires limités à RGPD, sécurité données stockées, privacy LLM, data sovereignty.'
---

# Product Requirements Document - Financed

**Author:** Cedric
**Date:** 2026-04-29

## Executive Summary

**Financed** est une application web premium de mise en ordre, lettrage et analyse intelligente des relevés bancaires personnels. L'utilisateur importe ses relevés au format PDF (sans connexion bancaire), l'application les transforme en interface visuelle premium ligne par ligne, puis le guide dans un rituel de validation manuelle où chaque transaction est catégorisée, lettrée, commentée et exploitable à long terme. Un copilote LLM intervient avec parcimonie pour assister la recherche, générer des récapitulatifs à la demande et faciliter la classification — sans jamais agir à la place de l'utilisateur.

Le produit cible trois profils d'utilisateurs particulièrement mal servis par les outils existants : les freelances en compte hybride pro/perso, les couples gérant plusieurs comptes (dont un compte joint), et les jeunes actifs urbains aux revenus variables et aux nombreuses créances/dettes amicales. Tous partagent une douleur commune : se sentir submergés et dépossédés face à la masse de transactions de leur relevé bancaire mensuel.

Le problème que Financed résout n'est pas *"je ne sais pas combien j'ai dépensé"* (résolu par les agrégateurs existants via des graphes auto-générés) mais *"je ne me retrouve pas dans mon argent"* — un sentiment de dépossession face à la complexité financière personnelle. La solution adresse ce sentiment par un rituel volontaire de réappropriation ligne par ligne : la friction est une feature, pas un bug.

### What Makes This Special

Financed se distingue par une **doctrine produit contrarian** dans un marché 2026 saturé d'agentic AI, de prédictif financier et de gamification. Six principes directeurs définissent l'identité de l'application :

1. **L'app reflète, ne ment pas, ne s'invente rien.** Aucune mutation automatique des lignes importées, aucune projection de soldes futurs, aucune comptabilité virtuelle interne.
2. **Friction volontaire = engagement.** L'utilisateur valide chaque ligne à la main ; cette validation est le rituel de réappropriation, pas une corvée à éviter.
3. **Identité visuelle unifiée et premium.** Une seule charte premium et claire, pas de variations contextuelles par fonction.
4. **Voix unique opinionated.** Un copilote bienveillant, premium, non configurable.
5. **LLM saupoudré, pas omniprésent.** Trois à quatre points d'usage signature (parsing PDF non standard, chatbot conversationnel à la demande, classification pro/perso, récapitulatifs sur commande). Tout calcul déterministe (somme, score, ratio) reste en code natif.
6. **Immuabilité factuelle / Mutabilité annotative.** Les lignes brutes sont figées définitivement à l'import ; toutes les annotations utilisateur (catégorie, lettrage, tags, commentaires) restent éditables à vie.

L'**insight de fond** qui rend ce positionnement défendable : la convergence en 2026 de trois forces (fatigue IA-everywhere, méfiance post-DSP2 envers les agrégateurs bancaires, maturité technique et économique des LLM sur données privées) ouvre une fenêtre rare pour un outil contrarian, premium, privacy-first et IA discrète.

Les **différenciateurs concrets** vs Bankin / Linxo / YNAB :

- **Pas de connexion bancaire** — import PDF manuel, contrôle utilisateur total
- **Lettrage avancé persistant** — une dépense en attente de remboursement reste comptée comme non lettrée jusqu'au remboursement effectif, fusionnant queue de validation et to-do list de créances amicales en un seul concept
- **Architecture event-sourced** — séparation stricte facts immutables / metadata mutables, garante d'une fiabilité historique parfaite
- **Garde-fous d'import paranoïaques** — vérification systématique de la somme des transactions vs total du PDF, détection stricte de doublons par hash
- **Sous-comptes virtuels pro/perso** — réponse au cas du compte hybride freelance, sans multiplier les comptes bancaires réels
- **Copilote LLM saupoudré** — chatbot conversationnel et dashboards génératifs uniquement sur demande explicite

## Project Classification

| Dimension | Valeur |
|---|---|
| **Type de produit** | Application web (SaaS personnel, navigateur uniquement, pas d'app mobile prévue même en V2+) |
| **Domaine** | Fintech-adjacent (finance personnelle sans connexion bancaire, sans paiement, sans KYC/AML, sans crypto) |
| **Complexité** | Élevée (parsing PDF robuste multi-banques, intégrité event-sourced des données, intégration LLM contrôlée, sécurité données financières, conformité RGPD) |
| **Contexte projet** | Greenfield — démarrage from scratch, aucune base de code existante |
| **Modèle économique** | Gratuit illimité en V1 — aucune monétisation prévue à ce stade (réduit le scope features de auth/billing/quota) |

**Périmètre réglementaire allégé** par décisions architecturales :
- ✅ S'applique : RGPD, sécurité données stockées, privacy LLM data flow, data sovereignty
- ❌ Ne s'applique pas : DSP2 / open banking, PCI DSS, KYC/AML, crypto regulations

**Modèle de déploiement V1 — Cloud-first via Supabase** : l'application est une SPA Next.js (App Router) backed par Supabase pour la persistance (Postgres + Auth + RLS). En V1, l'application tourne en **dev local uniquement** (`npm run dev` chez l'auteur) — pas de déploiement public, pas de Vercel encore. Le multi-device est natif via Supabase (l'auteur peut ouvrir l'app depuis plusieurs machines avec la même session). Les appels LLM (V1.5) sont relayés par les API routes Next.js, avec la clé Anthropic stockée côté serveur (env var). **V1 est conçue pour l'usage personnel de l'auteur** ; l'ouverture à d'autres utilisateurs ne nécessitera qu'un déploiement Vercel et une activation du flow d'inscription Supabase.

**Implications RGPD** : les données utilisateur étant stockées chez Supabase (Postgres hébergé en UE), le RGPD s'applique pleinement dès V1. L'auteur étant le seul utilisateur en V1, les obligations sont limitées (pas de DPO obligatoire, pas de déclaration CNIL pour usage personnel) mais l'architecture sera prête à se conformer à toute ouverture publique : export complet des données, suppression de compte, chiffrement at-rest natif Supabase.

## Success Criteria

### User Success

L'utilisateur (V1 : l'auteur lui-même) réussit avec Financed lorsque le rituel mensuel de mise en ordre se transforme d'une corvée anxiogène en un moment de réappropriation calme.

- **Aha moment** : à la fin de la première session de lettrage complet d'un mois, l'utilisateur voit le feu tricolore passer au vert et ressent que *"ça y est, je me retrouve dans mon argent"*.
- **Activation** : ≥ 80% des lignes du premier relevé importé sont validées en moins de 30 minutes.
- **Fidélité du rituel** : l'utilisateur revient le mois suivant et complète à nouveau ≥ 80% des validations en < 30 minutes (la friction baisse, le rituel s'installe).
- **Réappropriation** : à 3 mois d'usage, l'utilisateur retrouve via le chatbot LLM ou la recherche native une transaction passée en moins de 10 secondes.
- **Métrique émotionnelle** : à 3 mois, l'utilisateur déclare en auto-évaluation NPS ≥ 8/10 sur la question *"L'app me rend mon argent lisible"*.

### Business Success (V1 — usage personnel)

V1 = **gratuit illimité, zéro monétisation, zéro acquisition externe**. Le succès business est mesuré par la **validation personnelle de la doctrine et du moteur**, pas par l'adoption.

- **Adoption auteur** : 6 mois consécutifs d'utilisation mensuelle sans abandon par l'auteur.
- **Validation doctrine** : à 6 mois, l'auteur atteste par retour qualitatif que les six principes directeurs ont tenu à l'usage réel (pas de feature qui les viole en pratique).
- **Solidité moteur** : à 6 mois d'usage, ≥ 24 mois de relevés bancaires importés (au moins 2 années d'historique complet) avec zéro incident d'intégrité de données.
- **Readiness ouverture** : à 12 mois, le code est suffisamment propre, documenté et stable pour qu'un deuxième utilisateur (proche de l'auteur) puisse l'utiliser sans assistance technique.

### Technical Success

L'architecture Next.js + Supabase tient la promesse de la doctrine *"l'app reflète, ne ment pas"*.

- **Fiabilité d'import CSV/Excel** : ≥ 99% des fichiers exportés depuis les banques cibles (Banque Populaire en priorité, puis BNP, CA, SG, Boursorama, Revolut) sont parsés et passent le sanity check sans intervention utilisateur.
- **Fiabilité d'import PDF** (V1.5) : ≥ 95% des PDF Banque Populaire passent le sanity check ; LLM-vision en fallback couvre les autres banques avec un taux de succès ≥ 90%.
- **Détection de doublons** : 100% des ré-imports d'un PDF déjà ingéré sont détectés et bloqués (hash unique en base Postgres).
- **Immuabilité factuelle** : 0 mutation automatique de ligne brute observée (audit log Postgres + RLS interdisant les UPDATE sur la table `transactions`).
- **Performance lettrage** : action de validation ligne (catégorisation, lettrage, commentaire) < 200 ms en p95 (incluant aller-retour Supabase).
- **Performance chargement mois** : affichage de 300 lignes en < 500 ms (avec pagination ou virtualisation si besoin).
- **Performance chatbot LLM** (V1.5) : réponse à une question conversationnelle simple en < 5 s en p95.
- **Discipline LLM** : ratio "appels LLM / nombre de lignes vues" ≤ 0,05 (1 appel pour 20 lignes affichées en moyenne).
- **Sécurité Supabase** : RLS activée sur toutes les tables, policies strictes (`user_id = auth.uid()`), aucune table accessible sans auth, audit des migrations en CI.
- **Export RGPD** : export complet des données utilisateur en JSON disponible en self-service en < 60 secondes ; suppression de compte + données en < 24h via cascade delete.

### Measurable Outcomes (synthèse)

| KPI | Seuil V1 | Mesure |
|---|---|---|
| Activation : lignes validées en 1ère session | ≥ 80% | Telemetry Supabase |
| Rétention auteur (mois consécutifs) | 6 mois | Usage personnel |
| Sanity check import auto | ≥ 95% | Métrique technique |
| Doublons en base | 0 | Audit Postgres |
| Latence validation ligne (p95) | < 200 ms | APM Next.js + Supabase |
| Latence chatbot LLM (p95) | < 5 s | Logs API route |
| Ratio LLM / lignes | ≤ 0,05 | Telemetry serveur |
| NPS personnel *"l'app me rend mon argent lisible"* | ≥ 8/10 | Auto-évaluation |
| Mutations sur `transactions` | 0 | Audit log + RLS |

## Product Scope

### MVP — *"Le moteur fiable cloud-backed"*

**Inclus dans le MVP :**
- Application Next.js (App Router) backed par Supabase (Postgres + Auth + RLS)
- **Authentification Supabase** : email/password, session persistante, déconnexion propre
- Création de comptes bancaires nommés (toggle pro/perso à la création)
- **Import CSV / Excel universel** : drag & drop d'un fichier exporté depuis l'interface bancaire (toutes les banques classiques françaises et neobanques le proposent en 1-2 clics)
- Normalisation des colonnes par banque (mapping automatique des libellés "Date opération", "Libellé", "Montant", "Crédit/Débit" selon la banque source)
- Sanity check de la somme à l'import + détection stricte des doublons par hash
- Vue mensuelle (cards) avec compteur de lignes non lettrées + score tricolore mathématique
- Sous-comptes virtuels pro/perso sur les comptes hybrides
- Vue consolidée multi-comptes
- Catégorisation manuelle des lignes (avec catégories par défaut seedées)
- Lettrage manuel dépenses ↔ recettes (1-N)
- Système de remboursement attendu persistant (#20 — killer feature)
- Commentaires libres par ligne
- Onboarding sans friction (import direct après inscription, tutoriel inline skippable)
- Architecture event-sourced en Postgres : table `transactions` immutable (RLS deny UPDATE), tables `annotations` mutables indexées
- **Export RGPD** : dump JSON complet des données utilisateur en self-service
- **Suppression de compte** : cascade delete complet en < 24h
- Page de paramètres minimale : préférences utilisateur, catégories par défaut, gestion compte

**Volontairement exclu du MVP :**
- Toute fonctionnalité LLM (chatbot, dashboards génératifs, classification auto, Wrapped, parsing PDF non standard via LLM) — reportée en V1.5
- Multi-utilisateur / partage de comptes / collaboration — reporté V2
- Connexion bancaire / API banking — exclu définitivement (par doctrine)
- Application mobile — exclu (par décision web-only desktop)
- Déploiement public Vercel — reporté à l'ouverture publique post-V1
- Billing / abonnements — exclu V1 (gratuit illimité, voire ouvert à un cercle restreint)

### Growth Features — *"Le copilote arrive"* (V1.5)

Ajout du LLM saupoudré, qui transforme un outil fiable en un produit signature. Les appels LLM passent par les API routes Next.js (clé Anthropic stockée côté serveur en env var, jamais exposée au client). À l'ouverture publique, un quota par utilisateur sera ajouté pour maîtriser les coûts.

**Ajout également : import PDF**
- **Import PDF Banque Populaire** (parser déterministe) — pour les utilisateurs qui n'exportent pas en CSV
- **Fallback LLM-vision** sur les PDF d'autres banques (Claude Sonnet voit le PDF et extrait les transactions, validation par sanity check)

- **Chatbot conversationnel LLM** pour la recherche en langage naturel
- **Dashboards génératifs on-demand** par le LLM (épinglables au profil)
- **"Wrapped" personnalisé à la demande**
- **Classification automatique pro/perso** par le LLM avec validation utilisateur
- **Reconnaissance sémantique des virements récurrents**
- **Parsing PDF non standard via LLM** (fallback quand le parser déterministe échoue sur une banque inconnue)
- **Re-lettrage différé via auto-virement**
- **Tagging récurrent vs ponctuel par cochage persistant**
- **Action "Passer en perte"** sur créances pendantes
- **Tags personnalisés cherchables** (ex: "Bretagne 2026")

### Vision (Future, V2+)

- **Multi-utilisateur** : partage de comptes en lecture ou édition (RLS Supabase étendue avec une table `account_collaborators`)
- **Intégration légère factures émises** : ajout manuel + matching automatique avec les virements entrants
- **Récap automatique mensuel par email** (Edge Functions Supabase pour les jobs cron)
- **Tags facture émise** comme alternative légère à l'ERP intégré
- **Mode "audit" / journal d'activité** complet (Supabase Triggers + table `audit_log`)
- **Export multi-format** (CSV, OFX, Excel) au-delà du JSON RGPD
- **Déploiement public Vercel** + activation du flow d'inscription Supabase (probablement avec invitation initialement)
- **Ouverture publique élargie** : modèle économique à définir le moment venu (probablement freemium ou abonnement premium pur)

## User Journeys

### Journey 1 — Auteur, premier import (Happy Path)

**Scène d'ouverture.** L'auteur vient de lancer l'application en local. L'écran d'accueil est vide, premium, fonte soignée. Aucun questionnaire, aucune création de compte utilisateur. Un seul appel à l'action : *"Ajoute ton premier compte bancaire"*. Il tape un nom de compte, valide. L'application crée le compte et propose immédiatement *"Importe ton premier relevé"*.

**Action montante.** Il télécharge depuis l'espace en ligne de sa banque son relevé PDF du mois écoulé. Glisser-déposer sur la page. Une animation discrète indique l'extraction des transactions. Puis : *"✅ N lignes extraites. Somme vérifiée : N lignes = solde du PDF. Aucun doublon."* Confiance instantanée par la transparence.

**Climax.** L'écran bascule sur la vue mensuelle premium. Le mois s'affiche en card avec un badge *"N non lettrées"*. L'auteur clique. Les N lignes apparaissent : typographie d'orfèvre, hiérarchie claire, montants alignés, libellé brut intact. Il commence à valider une par une — clavier ou souris. Une dépense pour les courses → catégorise *"Courses"*. Un loyer arrive → catégorise. Une note de frais (plusieurs petites dépenses pro) → il commence à comprendre le lettrage : ces lignes attendent la recette de remboursement de son client. Une dépense pour un week-end avec un ami → il clique *"Quelqu'un me doit"*, saisit le nom et le libellé. La ligne reste comptée comme non lettrée même catégorisée — exactement comme prévu.

**Résolution.** Une vingtaine de minutes plus tard, le compteur affiche un petit nombre de non-lettrées (les attentes de remboursement). Le score mensuel apparaît : feu vert — recettes > dépenses. L'auteur ressent ce qu'il avait imaginé : un mois clos, en ordre, dans son contrôle. Il fait un export JSON backup en un clic, le sauvegarde sur son cloud personnel. Le moteur tient.

**Capabilities révélées :** Création de compte sans friction · Drag & drop d'import PDF · Parser PDF Banque Populaire (banque V1 prioritaire) · Sanity check de la somme · Détection de doublons · Vue mensuelle avec card, compteur et score · Vue lignes avec catégorisation rapide (clavier ou souris) · Lettrage de note de frais (1-N) · Marquage *"remboursement attendu"* persistant · Export JSON backup.

### Journey 2 — Auteur, rituel mensuel (mois M+1)

**Scène d'ouverture.** Premier jour du mois suivant. L'auteur reçoit son relevé bancaire couvrant une période chevauchante avec l'import précédent (par exemple 27 du mois précédent → 1er du mois suivant). Il importe.

**Action montante.** L'application détecte que les transactions des derniers jours du mois précédent sont déjà en base (hash identique) — elle les ignore et signale clairement *"X lignes déjà importées, ignorées"*. Les nouvelles lignes (mois courant) sont insérées. Le mois précédent reste figé : ses lignes brutes ne bougent pas. Si une transaction tombe dans le nouveau mois, ce mois vient de naître automatiquement avec sa propre card et son compteur.

**Climax.** L'auteur ouvre le mois courant. Il valide les lignes plus rapidement qu'au mois 1, car les commerçants récurrents (loyer, abonnements, courses) sont familiers. Il remarque qu'aucun virement de remboursement attendu n'est arrivé : la créance correspondante reste obstinément non lettrée dans le compteur du mois précédent.

**Résolution.** Le mois courant passe au vert. L'auteur clique sur le mois précédent : compteur toujours non nul à cause des créances pendantes. Il décide de relancer son débiteur dans la vraie vie, pas de modifier l'application. La ligne attend. La doctrine *"l'app reflète, ne ment pas"* tient.

**Capabilities révélées :** Détection de doublons cross-mois (transactions chevauchantes) · Création automatique d'un nouveau mois quand une ligne arrive dans une nouvelle période · Immuabilité des mois précédents · Persistance de l'état *"remboursement attendu"* entre imports · Historique des compteurs par mois.

### Journey 3 — Auteur, edge case sanity check failure

**Scène d'ouverture.** L'auteur tente d'importer un relevé qui contient un défaut de structure (PDF légèrement corrompu, format non parfaitement reconnu, ou tronquage d'une ligne).

**Action montante.** Le parser extrait N-1 lignes. Calcul de la somme algébrique. Total mentionné dans le PDF. Écart détecté. L'application bloque l'import et affiche un dialog clair : nombre de lignes extraites, somme calculée, total du PDF, écart précis. Trois options : annuler l'import, voir les lignes extraites pour identifier le problème, ou importer quand même (déconseillé, signalé visuellement).

**Climax.** L'auteur clique *"Voir les lignes extraites"*. Il scrolle, identifie qu'une transaction a un libellé tronqué ou un montant aberrant. Il annule, retélécharge le PDF source depuis sa banque, refait l'import : ✅ somme matchée. Importé proprement.

**Résolution.** L'auteur voit en pratique ce que la doctrine *"l'app ne ment pas"* signifie. Aucune donnée corrompue n'est entrée en base. La friction de cet incident est en réalité une expérience de confiance — l'application a refusé l'erreur silencieuse.

**Capabilities révélées :** Sanity check bloquant (pas seulement avertissement) · Dialog de résolution avec options claires · Visualisation des lignes extraites avant validation finale · Logique de re-import propre après échec.

### Journey 4 — Persona future (compatibilité V2)

> Ce journey n'est pas dans le périmètre V1 mais sert de **garde-fou architectural** : si une freelance en compte hybride pro/perso (persona Léa) peut un jour utiliser Financed sans réécrire le moteur, l'architecture V1 est bien conçue.

**Scène d'ouverture.** Une freelance UX installe Financed sur son navigateur perso (post-V1, avec ouverture publique). Aucune migration de données depuis la V1 solo de l'auteur — elle repart de zéro avec ses propres relevés. Elle crée un compte et coche le toggle pro/perso hybride.

**Action montante.** Elle importe son relevé du mois — un volume important de transactions (plusieurs centaines, freelance avec compte unique pour pro et perso). L'application pose la question signature : *"Veux-tu activer le mode pro/perso sur ce compte ?"* Elle coche oui. En V1, pas de classification LLM auto : elle catégorise à la main. En V1.5, le LLM proposera et elle validera. Ici, version V2+, le LLM auto-classifie pré-validé. En quelques minutes, tout est trié.

**Climax.** Le mois s'affiche avec deux sous-vues virtuelles : Pro et Perso. Pro affiche les lignes facturables et les dépenses professionnelles. Perso affiche le reste. Vue consolidée : tout combiné. Une note de frais avec 14 dépenses se lette d'un coup quand le virement client arrive — UX qui justifie l'app.

**Résolution.** L'utilisatrice fait un backup, et utilise l'application pour ses mois suivants. Quand elle a un nouveau compte (ex: ouverture d'un compte pro distinct), elle l'ajoute à l'application sans perte de cohérence avec son historique mixte.

**Capabilities révélées (existantes V1, à valider) :** Toggle pro/perso fonctionne dès la V1 · Sous-comptes virtuels rendus correctement même sans LLM · Compatible avec un volume important de transactions sans dégradation · Architecture data permet plus tard l'ajout du tri LLM sans casser l'historique · Multi-comptes proprement géré.

### Journey Requirements Summary

Les journeys ci-dessus révèlent les capabilities suivantes, regroupées par domaine fonctionnel :

| Domaine | Capabilities révélées |
|---|---|
| **Onboarding & Compte** | Création de compte sans friction · Toggle pro/perso à la création · Persistance Supabase Postgres + RLS |
| **Import** | Drag & drop CSV/Excel (V1 universel multi-banques) · Drag & drop PDF (V1.5 déterministe Banque Populaire + fallback LLM-vision) · Sanity check bloquant · Détection doublons par hash · Visualisation des lignes extraites avant validation · Création auto de mois |
| **Vue Mensuelle** | Cards par mois · Compteur lignes non lettrées · Score tricolore mathématique · Sous-vues pro/perso · Vue consolidée multi-comptes · Immuabilité des mois précédents |
| **Validation ligne** | Catégorisation rapide (clavier/souris) · Catégories par défaut seedées · Commentaires libres · Filtres et navigation |
| **Lettrage** | Lettrage 1-N (note de frais ↔ recette unique) · Remboursement attendu persistant · Compteur de non-lettrées comme to-do list de créances |
| **Backup** | Export JSON complet · Restauration depuis JSON · Tests round-trip validés |
| **Settings** | Page minimale — catégories par défaut · gestion compte · préférences utilisateur |

## Domain-Specific Requirements

### Compliance & Regulatory

Avec le déploiement cloud-first via Supabase, la surface réglementaire est maîtrisable mais réelle :

| Règlement | V1 (solo, dev local + Supabase cloud) | Post-V1 (ouverture publique) |
|---|---|---|
| **RGPD** | Applicable formellement (données chez Supabase EU) mais obligations limitées tant que l'auteur est seul utilisateur (pas de DPO, pas de CNIL pour usage strictement personnel) | Pleinement applicable : DPO recommandé, mentions légales, politique de confidentialité, durée de conservation, base légale du traitement |
| **DSP2 / Open Banking** | Non applicable (aucune connexion bancaire — par doctrine) | Non applicable par doctrine |
| **PCI DSS** | Non applicable (aucun paiement traité) | Non applicable par doctrine |
| **KYC / AML** | Non applicable (aucun mouvement de fonds) | Non applicable par doctrine |

**Implications V1 (auteur seul utilisateur) :**
- **Région Supabase** : projet hébergé en UE (Francfort ou Paris) pour conformité de localisation des données.
- **Chiffrement at-rest** : natif Supabase (Postgres avec encryption at rest).
- **Chiffrement en transit** : TLS systématique entre client Next.js et Supabase.
- **Fonctionnalités RGPD MVP** : export complet des données utilisateur en JSON (self-service en < 60 s) ; suppression de compte avec cascade delete (< 24h). Ces deux fonctionnalités sont MVP-critical pour préparer l'ouverture publique sans dette technique.
- **Audit log** : table `audit_log` recommandée dès V1 pour tracer toutes les opérations sensibles (login, import PDF, export, deletion).

### Technical Constraints

#### Stockage Supabase (Postgres)

- **Tables core** :
  - `users` (managed by Supabase Auth)
  - `accounts` (comptes bancaires nommés, FK `user_id`)
  - `transactions` (table append-only, RLS deny UPDATE, RLS deny DELETE sauf via cascade compte)
  - `transaction_annotations` (catégorisation, lettrage, commentaires, remboursement attendu — mutables, FK `transaction_id`)
  - `categories` (catégories utilisateur, seedées par défaut)
  - `imports` (audit des imports PDF avec hash, somme, date, status)
  - `audit_log` (log des opérations sensibles)
- **Row Level Security (RLS)** activée sur toutes les tables, policies strictes basées sur `auth.uid() = user_id`.
- **Pas de service_role exposé côté client** : toutes les opérations passent par les RLS et la session utilisateur.
- **Quota Supabase free tier** : 500 Mo Postgres, 5 Go bandwidth, 50 000 monthly active users. Largement suffisant pour usage personnel V1.

#### Sécurité

- **Chiffrement at-rest** : natif Supabase (Postgres encryption).
- **Chiffrement en transit** : TLS obligatoire entre client et Supabase, entre Next.js et Anthropic.
- **Sanitization des PDF importés** : le parser ne doit jamais exécuter de scripts embarqués, ne traiter que les couches texte / structure.
- **Secrets côté serveur** : la clé API Anthropic (V1.5) vit en env var `.env.local` côté Next.js, jamais exposée au client. Les API routes Next.js sont les seuls appelants.
- **Auth** : Supabase Auth avec email + password en V1 (magic link possible en V1.5). Session JWT, durée raisonnable (refresh token 7 jours), logout propre.

#### Privacy LLM (V1.5)

- **Architecture proxy** : les appels LLM passent par les API routes Next.js, jamais directement depuis le client. Cela permet : (a) de ne pas exposer la clé Anthropic, (b) de logger les appels pour respecter la doctrine "saupoudré" (≤ 0,05 appel/ligne), (c) d'ajouter un quota par utilisateur à l'ouverture publique.
- **Transparence sur les données envoyées** : avant chaque appel LLM significatif, l'application affiche quel sous-ensemble de données part vers Anthropic (par exemple : *"Envoi de 47 transactions du mois de mars vers le LLM pour générer le récap"*). L'utilisateur valide explicitement.
- **Discipline saupoudré** : le LLM est invoqué uniquement à la demande explicite (chatbot, récap, dashboard généré, classification au premier import). Pas de polling automatique, pas d'enrichissement passif.
- **Pas de fine-tuning, pas d'opt-in training** : les données utilisateur ne sont jamais utilisées pour entraîner des modèles tiers (header `anthropic-beta` configuré explicitement si besoin pour exclure le training).

#### Performance

- Validation d'une ligne (catégorisation, lettrage, commentaire) : < 200 ms en p95 (incluant aller-retour Supabase).
- Chargement d'un mois de 300 lignes : < 500 ms (avec virtualisation côté client si nécessaire).
- Réponse chatbot LLM (V1.5) : < 5 s en p95.

### Integration Requirements

| Intégration | Usage | Statut |
|---|---|---|
| **Next.js (App Router)** | Framework SPA + API routes côté serveur | MVP critique |
| **Supabase Postgres** | Stockage persistant cloud (transactions, annotations, comptes) | MVP critique |
| **Supabase Auth** | Authentification email/password, sessions, gestion compte | MVP critique |
| **Papa Parse** (ou équivalent) | Parsing CSV/Excel côté client | MVP critique |
| **PDF.js (Mozilla)** | Extraction texte / structure des PDF de relevés (côté client) | V1.5 |
| **Tailwind CSS + Radix / Headless UI** | UI premium et accessible | MVP critique |
| **GitHub** | Versionnement, CI (GitHub Actions), Issues | MVP |
| **Anthropic API** (Claude Sonnet 4.6) via Next.js API routes | Copilote LLM (chatbot, dashboards, classification, parsing PDF fallback) | V1.5 |
| **Vercel** | Déploiement (à activer à l'ouverture publique) | V2 |

### Risk Mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| **Indisponibilité Supabase** (incident, suspension free tier) | Application inutilisable | Export RGPD JSON régulier comme backup hors-Supabase. Migration vers self-hosted Postgres possible si Supabase devient bloquant |
| **PDF parser failure** sur un format inconnu ou corrompu | Données fausses ou incomplètes en base | Sanity check de la somme bloquant + visualisation des lignes extraites avant commit |
| **Faille RLS Supabase** (mauvaise policy laissant fuir les données d'un user à un autre) | Fuite de données utilisateur (catastrophique post-ouverture) | RLS testée systématiquement par fixtures multi-user en CI. Pas de service_role exposé côté client. Audit RLS à chaque migration |
| **Hallucination LLM** sur des données financières (V1.5) | Conseils ou réponses erronés | Le LLM n'a jamais d'autorité sur les facts (immutables). Il propose uniquement des annotations validables. Pas de prédictif, pas de mutation auto |
| **Fuite de clé API Anthropic** (clé serveur compromise) | Coût financier pour l'auteur | Clé en env var, jamais committée, rotation possible. Quota côté Anthropic configuré pour limiter le blast radius |
| **Évolution V2 multi-utilisateur** rendant l'archi V1 incompatible | Réécriture coûteuse | Architecture event-sourced + RLS dès V1 prépare le terrain : ajout d'une table `account_collaborators` suffira pour le partage |
| **Compte Supabase de l'auteur compromis** | Accès direct aux données | MFA activé sur le compte Supabase. Backup JSON régulier hors-Supabase |

### Décision architecturale : Stratégie d'Import (CSV-first)

L'analyse a fait émerger une **opportunité majeure de simplification** : toutes les banques classiques françaises (Banque Populaire, BNP, CA, SG, LCL, Crédit Mutuel, Boursorama) et les neobanques (Revolut, N26) offrent un export **CSV ou Excel** des transactions depuis leur interface en ligne, en 1 ou 2 clics.

Cela rend le **CSV/Excel comme format primaire d'import V1** dramatiquement plus simple, plus universel et plus fiable que le parsing PDF.

**Décision retenue : architecture d'import en couches.**

1. **MVP (V1) — Import CSV / Excel universel**
   - Parser tabulaire générique (Papa Parse ou équivalent, ~10 Ko)
   - Normalisation par banque : mapping automatique des colonnes selon le format source ("Date opération" / "Libellé" / "Montant" / "Crédit / Débit")
   - Sanity check : la somme algébrique de la colonne montant doit matcher le solde si présent dans le fichier ; sinon, simple cohérence interne
   - Détection des doublons par hash (date + montant + libellé normalisé)
   - **Couvre quasi 100% des banques cibles dès le MVP**, sans coder un parser par banque
   - Effort dev MVP : 2-5 jours vs 1-3 semaines pour PDF

2. **V1.5 — Ajout de l'import PDF**
   - **Parser déterministe Banque Populaire** : pour les utilisateurs qui ne peuvent pas / ne veulent pas exporter en CSV (cas marginal sur banques modernes, mais existe)
   - **Fallback LLM-vision (Claude Sonnet)** : pour les PDF d'autres banques. L'utilisateur valide explicitement l'appel LLM, le résultat passe par le sanity check
   - L'import PDF est un **chemin secondaire**, le CSV reste la voie royale

3. **V2+ — Élargissement** : parsers PDF déterministes additionnels selon volume utilisateur réel. Probablement inutiles si le CSV couvre 95% des cas.

**Avantage stratégique** : MVP livrable en jours, pas en semaines. Validation immédiate de la doctrine sur usage personnel de l'auteur. Cohérence renforcée avec "LLM saupoudré" — l'import principal ne convoque jamais le LLM.

## Innovation & Novel Patterns

### Detected Innovation Areas

Financed n'est pas une innovation purement technologique mais une **innovation de positionnement et d'architecture produit** dans un marché saturé. Cinq aspects portent une vraie nouveauté :

#### 1. Doctrine contrarian dans l'ère agentic AI

En 2026, l'industrie fintech consumer pousse massivement vers l'agentic AI (l'IA agit, prédit, classe, alerte de façon autonome). Financed prend la posture inverse : *"L'IA propose, l'humain dispose"*. Cela en fait l'inverse architectural des outils dominants (Bankin, Linxo, YNAB) et de la nouvelle vague IA-first (Cleo, Monarch). L'innovation n'est pas une feature mais une prise de position d'auteur opinionated.

#### 2. Privacy par minimisation : "no bank connection"

Là où la quasi-totalité des outils consumer fintech 2026 (Bankin, Linxo, Monarch, Cleo) reposent sur une connexion bancaire DSP2 — donc sur l'agrégation continue des transactions par un tiers — Financed refuse délibérément cet accès. L'utilisateur importe lui-même son fichier (CSV/Excel V1, PDF V1.5), garde le contrôle du *quand* et du *quoi*. Cette **minimisation des données collectées** est une posture privacy rare : les données sont stockées chez Supabase mais limitées au strict minimum apporté volontairement par l'utilisateur, jamais issues d'un siphon bancaire continu.

#### 3. Lettrage de remboursement comme état persistant

L'idée que le compteur de lignes non lettrées sert simultanément de queue de validation **et** de to-do list de créances amicales fusionne deux concepts en un seul. Cette élégance UX n'existe dans aucun outil personnel grand public examiné.

#### 4. Architecture event-sourced consumer-grade

La séparation stricte facts immuables (transactions brutes) / metadata mutables (annotations utilisateur) est rare dans le grand public — elle vient typiquement du back-office bancaire ou de la comptabilité enterprise. L'appliquer à un outil grand public premium est nouveau.

#### 5. PDF-first vs API-first

Tous les outils contemporains poussent vers la connexion bancaire via DSP2. Refuser l'API au profit de l'import PDF manuel est un anti-pattern volontaire : c'est le retour à un mode opératoire pré-2018 mais avec une UX post-2026. Cela attire un segment précis (utilisateurs méfiants de l'agrégation bancaire) que personne ne sert correctement aujourd'hui.

### Market Context & Competitive Landscape

| Acteur | Positionnement | Différence vs Financed |
|---|---|---|
| **Bankin'** | Agrégateur bancaire grand public, dashboard auto | Connexion bancaire DSP2, IA prédictive, ton neutre/froid, pas de lettrage |
| **Linxo** | Agrégateur grand public, conseils auto | Connexion bancaire DSP2, focus catégorisation auto, pas de doctrine de validation manuelle |
| **YNAB** | Méthode budgétaire stricte, US-centric, abonnement payant | Approche prescriptive du budget, pas de lettrage de remboursements amicaux, complexité d'apprentissage élevée |
| **Cleo** | Coach IA sassy, mobile-first | Personnalité IA omniprésente, gamification, ton humoristique, pas privacy-first |
| **Monarch Money** | Premium, design soigné, multi-comptes, IA conseil | Cloud, connexion bancaire, abonnement, pas de mode local |
| **Excel / Notion** | Zero magic, contrôle total | Aucune intelligence métier, aucun parsing PDF, friction maximale |

**Positionnement unique de Financed** : un produit qui occupe la case vide entre le contrôle absolu d'Excel et l'automatisation totale des SaaS bancaires. Ni l'un ni l'autre — un troisième chemin.

### Validation Approach

L'innovation principale (doctrine contrarian, privacy par minimisation, lettrage avancé) sera validée par l'auteur lui-même en V1, sur 6 à 12 mois d'usage personnel. Trois questions de validation :

1. **La doctrine tient-elle à l'usage ?** L'auteur a-t-il été tenté de violer un des six principes directeurs en pratique ? Si oui, la doctrine est trop rigide ou mal calibrée.
2. **Le rituel mensuel s'installe-t-il durablement ?** L'auteur revient-il chaque mois importer son CSV et valider ses lignes en moins de 30 minutes, ou abandonne-t-il après 2-3 mois ?
3. **Le lettrage de remboursement persistant tient-il sa promesse ?** Sur les créances réelles de l'auteur, le compteur de non-lettrées sert-il vraiment de to-do list active, ou devient-il un cimetière oublié ?

Si les trois réponses sont positives à 6 mois, la V1 ouvre vers l'expérimentation V1.5 et les premiers utilisateurs externes (proches). Si une seule réponse est négative, retour au PRD avec correction de doctrine ou de feature.

### Risk Mitigation

| Risque innovation | Mitigation |
|---|---|
| **La doctrine contrarian rebute les utilisateurs habitués à l'IA-everywhere** | V1 = usage personnel auteur. Pas de validation marché en V1, donc pas de risque. Validation marché viendra en V2 sur un segment ciblé (utilisateurs déjà méfiants des agrégateurs) |
| **Supabase rend l'app dépendante d'un fournisseur tiers** | Architecture en couches : Postgres pur via `supabase-js` isolé dans un module dédié. Migration possible vers self-hosted Postgres ou autre fournisseur si nécessaire. Export RGPD JSON régulier comme filet de sécurité hors-Supabase |
| **Le lettrage de remboursement n'est pas compris par l'utilisateur grand public** | Tutoriel inline contextuel à la première utilisation de la feature. En V1 (auteur seul), l'auteur connaît déjà le concept |
| **L'architecture event-sourced complique le développement V1 sans bénéfice immédiat** | Stricte discipline : table `transactions` immutable, table `annotations` mutable indexée par `transaction_id`. Pas de surengineering — la séparation suffit |
| **Le PDF-first est inopérant si Banque Populaire change son format** | Sanity check de la somme + parser robuste. La V1.5 (LLM-vision fallback) absorbe le risque post-MVP |

## Web Application Specific Requirements

### Project-Type Overview

Financed est une application web Next.js (App Router) avec persistance Supabase (Postgres + Auth + RLS). En V1, elle tourne en dev local uniquement (`npm run dev`). Web-only desktop, pas de mobile. SPA-comme, server components Next.js pour les rendus initiaux + client components pour les interactions riches.

### Technical Architecture Considerations

#### Architecture applicative

- **Next.js App Router** : server components pour les chargements de page initiaux, client components pour les interactions riches (filtrage, navigation rapide, lettrage).
- **API routes** Next.js (`app/api/...`) pour : ingestion CSV/PDF (parsing côté serveur ou côté client selon volume), proxy LLM (V1.5), endpoints d'export RGPD.
- **Supabase client** (`@supabase/supabase-js`) côté client pour les lectures simples authentifiées (RLS protège), côté serveur via `cookies()` pour les mutations sensibles.
- Pas de SSR/SSG sur les pages métier (vues stateful). SSG possible pour landing/login.

#### Stack confirmée

| Couche | Choix | Justification |
|---|---|---|
| **Framework** | Next.js (App Router) | Choix auteur ; routes serveur pour proxy LLM, hydration des pages métier |
| **Langage** | TypeScript strict | Discipline data + types Supabase générés |
| **Base de données** | Supabase Postgres + RLS | Choix auteur ; auth incluse, RLS pour sécurité, free tier confortable |
| **Auth** | Supabase Auth (email/password V1, magic link envisageable V1.5) | Choix auteur ; intégration native, JWT, sessions |
| **Parser CSV / Excel** | Papa Parse (ou xlsx pour Excel) côté client | Universel, léger, zéro dépendance serveur |
| **Parser PDF** (V1.5) | PDF.js (Mozilla), côté client ; LLM-vision via API route | Standard de fait pour PDF, fallback LLM contrôlé |
| **UI / Styling** | Tailwind CSS + Radix Primitives ou shadcn/ui | Premium, accessible, cohérent avec promesse "premium et clair" |
| **State client** | Zustand ou TanStack Query | Cache + sync avec Supabase |
| **LLM (V1.5)** | Anthropic Claude Sonnet 4.6 via Next.js API routes | Clé en env var serveur, proxy contrôlé |
| **Tests** | Vitest (unit/integration) + Playwright (E2E) | Standard moderne |
| **Lint / Format** | ESLint + Prettier strict TypeScript | Discipline |
| **CI** | GitHub Actions (lint + test + build + tests RLS multi-user) | Auto-validation à chaque PR |
| **Hosting V1** | Dev local (`npm run dev`) | Choix auteur ; Vercel à activer plus tard |
| **VCS** | GitHub | Choix auteur |

#### Browser Matrix

Cible : derniers évergreens (Chrome / Edge / Firefox / Safari, 2 dernières versions stables). Pas de support legacy.

#### Responsive Design

Desktop-first (≥ 1280 px cible primaire). Mobile (< 768 px) intentionnellement non supporté V1 — message *"Financed est conçu pour desktop. Reviens depuis ton ordinateur."* La friction mobile décourage de force un mauvais usage (le rituel mensuel de validation de 100-300 lignes est un usage assis devant l'ordinateur).

#### Performance Targets

| Métrique | Cible |
|---|---|
| **Time to Interactive cold start** (dev local) | < 2 s |
| **Validation d'une ligne** (mutation Supabase, p95) | < 200 ms |
| **Chargement d'un mois de 300 lignes** (via Supabase) | < 500 ms |
| **Import CSV / Excel** (~150 lignes) | < 1 s |
| **Import PDF + parse** (V1.5, Banque Populaire ~150 lignes) | < 3 s |
| **Bundle initial** (gzip) | < 500 Ko |
| **Réponse chatbot LLM** (V1.5, p95) | < 5 s |

#### SEO Strategy

Aucune SEO en V1 (dev local, pas de prod hosting). À l'ouverture publique, une landing page SSG Next.js sera ajoutée, optimisée pour requêtes type *"alternative à Bankin sans connexion bancaire"*.

#### Real-Time

V1 : aucun besoin temps réel. Supabase Realtime à évaluer en V2 pour multi-utilisateur (deux personnes éditant le même compte joint).

#### Accessibility (WCAG)

WCAG 2.2 niveau AA sur les parcours critiques :
- Navigation clavier complète (catégoriser, lettrer, commenter, naviguer)
- Contrastes ≥ 4,5:1 pour le texte normal, 3:1 pour grand texte
- Sémantique HTML stricte (`button`, `nav`, `main`, `dialog`, `aria-live`)
- Focus visible avec design soigné
- Annonces lecteur d'écran pour statuts de validation, succès d'import, alertes sanity check, score mensuel
- Respect de `prefers-reduced-motion`

### Implementation Considerations

- **Schéma Postgres versionné** : migrations gérées via Supabase CLI, commitées sur GitHub.
- **Types TypeScript générés** : `supabase gen types typescript` après chaque migration, commités pour le typage strict.
- **RLS testée en CI** : fixtures multi-user pour vérifier qu'aucune policy ne fuit (même en V1 mono-user, anticipation V2).
- **Env vars** : `.env.local` (jamais committé), `.env.example` documenté sur GitHub.
- **Déploiement V1** : aucune action serveur. L'auteur lance `npm run dev`, configure Supabase via dashboard.
- **Déploiement V2 (Vercel)** : push GitHub → déploiement auto. Env vars Vercel pour Supabase URL/keys + Anthropic API key.

### Sections explicitement non applicables

- `native_features` (du template web_app) : pas d'app native, exclu V1 et au-delà.
- `cli_commands` (du template web_app) : pas de CLI, exclu.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche MVP retenue : Problem-Solving MVP + Doctrine Validation.**

Le V1 n'est pas un MVP de marché (pas d'utilisateurs externes, pas de monétisation, pas d'objectif d'acquisition). C'est un **MVP de validation personnelle de la doctrine** : l'auteur valide sur lui-même que les six principes directeurs tiennent à l'usage réel pendant 6-12 mois. Si oui, ouverture progressive ; si non, retour PRD avec correction.

**Critères de réussite MVP :**

1. **Le moteur tient** — import CSV fiable, lettrage performant, pas de mutation auto, pas de doublon, intégrité event-sourced préservée
2. **Le rituel mensuel s'installe** — 6 mois consécutifs d'usage par l'auteur, < 30 min par mois pour valider 100 % des lignes d'un mois
3. **La killer feature fonctionne** — le compteur de remboursements attendus persistants sert vraiment de to-do list active sur les créances réelles de l'auteur

**Resource Requirements**

| Ressource | Niveau V1 |
|---|---|
| **Équipe** | Solo (auteur) |
| **Skill mix** | Full-stack TypeScript / React / Postgres |
| **Temps** | ~2-4 semaines équivalent temps plein pour le MVP (hors LLM, V1.5 séparé) |
| **Coût infrastructure** | 0 € (Supabase free tier, dev local, pas de Vercel V1) |
| **Coût LLM (V1.5)** | < 5 €/mois en usage personnel saupoudré |

### MVP Feature Set (Phase 1)

**Core User Journeys supportés :** Journey 1 (premier import) · Journey 2 (rituel mensuel M+1) · Journey 3 (edge case sanity check failure). Journey 4 (persona future) sert de garde-fou architectural.

**Must-Have Capabilities (consolidé) :**

| Domaine | Capacités MVP |
|---|---|
| **Auth** | Inscription + login email/password (Supabase Auth) · Logout · Session persistante |
| **Compte bancaire** | Création nommée · Toggle pro/perso à la création · Multi-comptes |
| **Import** | Drag & drop CSV/Excel universel · Normalisation colonnes par banque · Sanity check somme bloquant · Détection doublons par hash · Visualisation pré-commit |
| **Vue mensuelle** | Cards par mois · Compteur non-lettrées · Score tricolore mathématique · Sous-vues virtuelles pro/perso · Vue consolidée multi-comptes · Immuabilité mois précédents |
| **Validation ligne** | Catégorisation rapide (clavier + souris) · Catégories par défaut seedées · Commentaires libres · Filtres |
| **Lettrage** | 1-N (note de frais ↔ recette unique) · Remboursement attendu persistant · Compteur = to-do list créances |
| **Architecture data** | Tables Postgres event-sourced · `transactions` immutable (RLS deny UPDATE) · `transaction_annotations` mutable · `audit_log` |
| **RGPD MVP** | Export complet JSON self-service · Suppression compte cascade |
| **Settings** | Préférences · Catégories par défaut · Gestion compte |
| **Onboarding** | Inscription → import direct · Tutoriel inline skippable · Catégories seedées |

### Post-MVP Features

#### Phase 2 (V1.5) — *"Le copilote arrive"*

- Chatbot conversationnel LLM (recherche en langage naturel)
- Dashboards génératifs LLM on-demand (épinglables)
- Wrapped à la demande (jamais programmé)
- Classification automatique pro/perso par LLM avec validation
- Reconnaissance sémantique des virements récurrents
- Import PDF Banque Populaire (parser déterministe) + fallback LLM-vision pour autres banques
- Re-letrage différé via auto-virement
- Tagging récurrent vs ponctuel par cochage
- Action *"Passer en perte"* sur créances pendantes
- Tags personnalisés cherchables

#### Phase 3 (V2+) — *"L'écosystème"*

- Multi-utilisateur : partage de comptes en lecture/édition (RLS étendue + table `account_collaborators`)
- Intégration légère factures émises + matching automatique virements entrants
- Récap mensuel par email (Edge Functions Supabase)
- Mode audit / journal d'activité complet
- Export multi-format (CSV, OFX, Excel)
- Déploiement public Vercel + activation flow inscription Supabase
- Ouverture publique élargie (modèle économique à définir)

### Risk Mitigation Strategy

#### Technical Risks

| Risque | Impact | Mitigation |
|---|---|---|
| **Variabilité format CSV par banque** | Parser cassé sur certaines banques | Normalisation explicite par banque source, identifiable au header CSV. Tests unitaires avec fixtures CSV de chaque banque cible. Fallback : UI laissant l'utilisateur mapper les colonnes manuellement |
| **Faille RLS Supabase** (mauvaise policy) | Fuite de données utilisateur (catastrophique post-ouverture) | RLS testée systématiquement par fixtures multi-user en CI. Pas de service_role exposé côté client. Audit RLS à chaque migration |
| **Indisponibilité Supabase** | App inutilisable | Export RGPD JSON régulier comme backup hors-Supabase. Migration possible vers self-hosted Postgres si besoin |
| **Hallucination LLM** (V1.5) | Conseils ou réponses erronés | Le LLM n'a jamais d'autorité sur les facts. Pas de prédictif. Pas de mutation auto |
| **Architecture event-sourced trop complexe** | Surengineering V1 | Discipline stricte : 2 tables (immutable + mutable), pas de CQRS, pas d'event store complet. La séparation suffit |

#### Market Risks

V1 n'est pas exposée au marché. Les risques marché s'appliqueront à V2 (ouverture publique) et seront évalués à ce moment-là sur la base de la validation V1.

#### Resource Risks

| Risque | Impact | Mitigation |
|---|---|---|
| **Solo dev (bus factor 1)** | Si l'auteur ne peut plus coder, projet mort | V1 personnel, pas de dépendance externe. Code GitHub permet reprise par tiers si nécessaire |
| **Scope MVP gonflé** | Livraison MVP retardée → abandon | Discipline scope stricte. CSV-first déjà utilisé pour réduire l'effort dev par 3-5x vs PDF-first |
| **Effort V1.5 LLM sous-estimé** | Glissement V1.5 | V1.5 est un stretch, pas une obligation. L'auteur peut vivre sans LLM tant que le V1 valide la doctrine |

## Functional Requirements

> **Altitude** : chaque FR décrit *ce que* le produit fait, jamais *comment*. Phase indiquée par préfixe `[V1]`, `[V1.5]`, `[V2]`.

### User Account Management

- **FR1** : `[V1]` Un utilisateur peut créer un compte Financed avec email et mot de passe.
- **FR2** : `[V1]` Un utilisateur peut se connecter à son compte existant.
- **FR3** : `[V1]` Un utilisateur peut se déconnecter de sa session active.
- **FR4** : `[V1]` Un utilisateur peut récupérer l'accès à son compte via réinitialisation par email.
- **FR5** : `[V1]` Un utilisateur peut supprimer son compte, déclenchant la suppression cascade de toutes ses données en moins de 24h.

### Bank Account Management

- **FR6** : `[V1]` Un utilisateur peut créer un compte bancaire nommé.
- **FR7** : `[V1]` Un utilisateur peut activer le mode hybride pro/perso à la création d'un compte bancaire.
- **FR8** : `[V1]` Un utilisateur peut renommer ou supprimer un compte bancaire.
- **FR9** : `[V1]` Un utilisateur peut gérer plusieurs comptes bancaires en parallèle.
- **FR10** : `[V1]` Un utilisateur peut consulter un dashboard global agrégeant tous ses comptes bancaires.

### Transaction Import

- **FR11** : `[V1]` Un utilisateur peut importer ses transactions en glissant-déposant un fichier CSV ou Excel exporté depuis sa banque.
- **FR12** : `[V1]` Le système normalise automatiquement les colonnes du fichier importé selon la banque source détectée.
- **FR13** : `[V1]` Le système effectue une vérification d'intégrité (somme des transactions importées vs total déclaré dans le fichier ou cohérence interne).
- **FR14** : `[V1]` Le système bloque l'import si la vérification d'intégrité échoue, en présentant à l'utilisateur des options claires (annuler, voir détails, importer quand même).
- **FR15** : `[V1]` Le système détecte les transactions doublons à l'import (par hash) et les ignore en notifiant explicitement l'utilisateur.
- **FR16** : `[V1]` Un utilisateur peut prévisualiser les transactions extraites avant validation finale de l'import.
- **FR17** : `[V1]` Le système crée automatiquement un nouveau mois lorsque des transactions arrivent dans une période non couverte.
- **FR18** : `[V1]` Le système peut, en cas d'échec de normalisation automatique, proposer à l'utilisateur de mapper manuellement les colonnes du fichier.
- **FR19** : `[V1.5]` Un utilisateur peut importer ses transactions en glissant-déposant un PDF Banque Populaire (parser déterministe).
- **FR20** : `[V1.5]` Le système peut recourir à un parser LLM-vision pour les PDF d'autres banques, après consentement explicite de l'utilisateur.

### Monthly View & Navigation

- **FR21** : `[V1]` Un utilisateur peut consulter une liste de cards mensuelles synthétisant l'activité de chaque mois.
- **FR22** : `[V1]` Chaque card mensuelle affiche un compteur de lignes non lettrées et un indicateur tricolore (vert si recettes ≥ dépenses, rouge sinon).
- **FR23** : `[V1]` Un utilisateur peut ouvrir une card mensuelle pour visualiser toutes les transactions du mois correspondant.
- **FR24** : `[V1]` Pour un compte hybride pro/perso, un utilisateur peut basculer entre la vue Pro, la vue Perso et la vue Consolidée d'un mois.
- **FR25** : `[V1]` Un utilisateur peut filtrer les transactions d'un mois par statut de lettrage, catégorie, montant, marchand ou recherche textuelle.
- **FR26** : `[V1]` Un utilisateur peut naviguer entre les transactions au clavier ou à la souris.
- **FR27** : `[V1]` Le système garantit l'immuabilité des transactions des mois précédemment importés : un import ultérieur ne peut pas modifier leurs lignes brutes.

### Categorization & Annotation

- **FR28** : `[V1]` Un utilisateur peut assigner une catégorie à n'importe quelle transaction.
- **FR29** : `[V1]` Un utilisateur peut créer, renommer ou supprimer des catégories.
- **FR30** : `[V1]` Le système seed un set de catégories par défaut au premier import.
- **FR31** : `[V1]` Un utilisateur peut ajouter un commentaire libre à n'importe quelle transaction.
- **FR32** : `[V1]` Un utilisateur peut éditer la catégorie ou le commentaire d'une transaction de n'importe quel mois, sans limite de temps.
- **FR33** : `[V1.5]` Un utilisateur peut associer un tag personnalisé cherchable à une transaction.
- **FR34** : `[V1.5]` Un utilisateur peut marquer un type de revenu comme récurrent (auto-classifié à l'avenir) ou ponctuel (qualification à chaque occurrence).

### Reconciliation (Lettrage)

- **FR35** : `[V1]` Un utilisateur peut lettrer une dépense unique avec une recette unique correspondante.
- **FR36** : `[V1]` Un utilisateur peut lettrer plusieurs dépenses avec une recette unique (lettrage 1-N).
- **FR37** : `[V1]` Un utilisateur peut marquer une dépense comme attendant un remboursement, en saisissant le nom du débiteur et un libellé descriptif.
- **FR38** : `[V1]` Une transaction marquée *"remboursement attendu"* reste comptée comme non lettrée tant que le remboursement n'est pas effectivement lettré.
- **FR39** : `[V1.5]` Un utilisateur peut marquer manuellement un remboursement attendu comme *"passé en perte"*, retirant la ligne du compteur de non-lettrées.
- **FR40** : `[V1.5]` Un utilisateur peut indiquer qu'une dépense de compte pro est en réalité personnelle (ou inversement), déclenchant une suggestion de virement compensatoire à effectuer dans la vraie vie.

### Financial Insights (Non-LLM)

- **FR41** : `[V1]` Le système calcule et affiche un score mensuel mathématique basé sur la différence recettes - dépenses.
- **FR42** : `[V1]` Un utilisateur peut consulter les totaux par catégorie pour un mois ou agrégés sur plusieurs mois.
- **FR43** : `[V1]` Un utilisateur peut rechercher des transactions par nom de marchand sur l'ensemble de son historique importé.

### LLM Copilot

- **FR44** : `[V1.5]` Un utilisateur peut interroger le copilote LLM en langage naturel à propos de ses transactions.
- **FR45** : `[V1.5]` Le système peut générer à la volée des dashboards visuels en réponse à une question utilisateur, épinglables au profil.
- **FR46** : `[V1.5]` Un utilisateur peut demander un récapitulatif (annuel ou sur période choisie) au copilote LLM.
- **FR47** : `[V1.5]` Le système peut proposer une classification pro/perso automatique sur les transactions d'un compte hybride, requérant validation utilisateur ligne par ligne.
- **FR48** : `[V1.5]` Le système peut reconnaître par analyse sémantique des libellés les virements clients récurrents et proposer des correspondances pour validation.
- **FR49** : `[V1.5]` Le système affiche, avant tout appel LLM significatif, le sous-ensemble de données envoyé à Anthropic, requérant confirmation explicite.
- **FR50** : `[V1.5]` Le copilote LLM ne peut jamais muter des transactions brutes ; il propose uniquement des annotations validables par l'utilisateur.

### Data Management & Privacy

- **FR51** : `[V1]` Un utilisateur peut exporter l'intégralité de ses données utilisateur sous forme de fichier JSON, en moins de 60 secondes.
- **FR52** : `[V1]` Le système maintient un journal d'audit des opérations sensibles (login, import, export, suppression).
- **FR53** : `[V1]` Le système garantit l'immuabilité des transactions brutes via des policies RLS Postgres interdisant les UPDATE sur la table `transactions`.
- **FR54** : `[V1]` Toutes les données utilisateur sont strictement isolées par Row-Level Security.

### Onboarding & Settings

- **FR55** : `[V1]` Un nouvel utilisateur peut accéder à l'import de son premier relevé immédiatement après inscription, sans questionnaire préalable obligatoire.
- **FR56** : `[V1]` Le système affiche des bulles tutorielles inline contextuelles à la première utilisation de chaque fonctionnalité, toutes skippables.
- **FR57** : `[V1]` Un utilisateur peut modifier ses préférences (catégories par défaut, gestion compte) depuis une page Settings minimaliste.
- **FR58** : `[V2]` Un utilisateur peut inviter un autre utilisateur en lecture ou édition sur un de ses comptes bancaires.

### Visual Identity (UX)

- **FR59** : `[V1]` Le système affiche les transactions avec une typographie premium et une hiérarchie visuelle claire.
- **FR60** : `[V1]` Le système affiche un message dédié aux utilisateurs sur écran mobile (< 768 px) indiquant que Financed est conçu pour desktop.

## Non-Functional Requirements

### Performance

- **NFR1** : La validation d'une transaction (catégorisation, lettrage, ajout de commentaire) se complète en moins de 200 ms en p95 (incluant aller-retour Supabase).
- **NFR2** : Le chargement complet de la vue mensuelle d'un mois contenant jusqu'à 300 transactions s'effectue en moins de 500 ms en p95.
- **NFR3** : L'import et le parsing d'un fichier CSV/Excel de 150 transactions se complète en moins de 1 seconde en p95.
- **NFR4** : Le bundle JavaScript initial téléchargé par le client est inférieur à 500 Ko en gzip.
- **NFR5** : `[V1.5]` La réponse à une question conversationnelle simple via le copilote LLM est livrée en moins de 5 secondes en p95.

### Security

- **NFR6** : Toutes les communications entre le client et Supabase utilisent TLS 1.2 ou supérieur.
- **NFR7** : Toutes les communications entre les API routes Next.js et l'API Anthropic utilisent TLS 1.2 ou supérieur.
- **NFR8** : Les données stockées dans Supabase Postgres sont chiffrées at-rest (chiffrement natif du fournisseur).
- **NFR9** : Toutes les tables contenant des données utilisateur sont protégées par des policies RLS Postgres vérifiant `auth.uid() = user_id`.
- **NFR10** : Aucune route ou opération côté client ne peut accéder à la `service_role key` Supabase. Cette clé reste exclusivement côté serveur.
- **NFR11** : `[V1.5]` La clé API Anthropic est stockée exclusivement en variable d'environnement serveur, jamais transmise au client, jamais loggée en clair.
- **NFR12** : Le compte Supabase de l'auteur est protégé par MFA (multi-factor authentication).

### Reliability & Data Integrity

- **NFR13** : La table `transactions` rejette par contrainte RLS toute opération UPDATE ; aucune mutation auto des transactions brutes n'est possible techniquement.
- **NFR14** : Le système détecte et bloque 100 % des doublons à l'import (hash unique sur date + montant + libellé normalisé).
- **NFR15** : Le système rejette par sanity check tout import dont la somme des transactions diverge du total déclaré dans le fichier source (au-delà d'un seuil de tolérance d'arrondi de 0,01 €).
- **NFR16** : Le journal d'audit (`audit_log`) capture 100 % des opérations sensibles (login, import, export, suppression de compte ou de transaction-annotation).
- **NFR17** : L'export RGPD au format JSON contient l'intégralité des données utilisateur (transactions brutes, annotations, comptes, settings, audit log) sans perte ni transformation.

### Accessibility

- **NFR18** : Les parcours critiques (inscription, login, import, validation de ligne, lettrage, export) sont conformes WCAG 2.2 niveau AA.
- **NFR19** : Toutes les actions utilisateur (catégoriser, lettrer, commenter, naviguer) sont accessibles au clavier seul, sans dépendance souris.
- **NFR20** : Les contrastes texte/fond respectent AA : ratio ≥ 4,5:1 pour le texte normal, ≥ 3:1 pour le grand texte (≥ 18 px ou ≥ 14 px gras).
- **NFR21** : L'interface respecte la préférence utilisateur `prefers-reduced-motion` (désactivation des animations non-essentielles si demandé).

### Integration

- **NFR22** : L'application reste fonctionnelle même si l'API Anthropic est indisponible : seules les fonctionnalités LLM (V1.5) sont dégradées, les opérations core continuent.
- **NFR23** : Les intégrations Supabase (Postgres, Auth) sont remplaçables : la couche d'accès (`@supabase/supabase-js`) est isolée dans un module dédié, permettant une migration future vers self-hosted Postgres si nécessaire.
- **NFR24** : Les types TypeScript du schéma Postgres sont régénérés automatiquement après chaque migration via `supabase gen types typescript` et commités dans le repo.

### Compliance & Privacy

- **NFR25** : Toutes les données utilisateur sont hébergées sur un projet Supabase localisé en Union Européenne (région Paris ou Francfort).
- **NFR26** : L'export complet des données utilisateur au format JSON est disponible en self-service en moins de 60 secondes.
- **NFR27** : La suppression d'un compte utilisateur déclenche la suppression cascade de toutes ses données en moins de 24 heures, avec confirmation par email.
- **NFR28** : `[V1.5]` Avant tout appel LLM significatif, l'application affiche à l'utilisateur le sous-ensemble exact de données envoyées à Anthropic et requiert une confirmation explicite.
- **NFR29** : Aucune donnée utilisateur n'est utilisée pour entraîner des modèles tiers (paramétrage Anthropic API explicite).

### Doctrinal Constraints

> Ces contraintes encodent les six principes directeurs de la doctrine produit en exigences testables.

- **NFR30** : `[V1.5]` Le copilote LLM s'exprime systématiquement avec un ton **bienveillant et premium** : pas de sarcasme, pas de culpabilisation, pas de gamification chronique. Validation : revue manuelle d'un échantillon de 50 réponses LLM par release, taux de conformité au ton ≥ 95 %.
- **NFR31** : Le système n'affiche **jamais de prédiction** de soldes futurs, de dépenses projetées ou de revenus anticipés. Aucune métrique forward-looking n'est calculée ni présentée à l'utilisateur. (Anti-feature explicite.)
- **NFR32** : Aucune action automatique du système (catégorisation, lettrage, classification, tagging récurrent) n'est appliquée sans validation explicite de l'utilisateur. L'IA propose, l'humain dispose — sans exception.
- **NFR33** : L'interface respecte un principe d'**anti-surcharge cognitive** : pas plus de 2 propositions LLM visibles simultanément à l'écran ; pas de modal sur modal ; settings minimalistes ; notifications LLM uniquement sur action utilisateur, jamais en push automatique.
- **NFR34** : Le ratio "appels LLM / nombre de lignes affichées par l'utilisateur" reste inférieur ou égal à **0,05** (1 appel LLM pour 20 lignes vues en moyenne, mesuré sur fenêtre glissante de 30 jours). Garantit la discipline *"LLM saupoudré"*.
