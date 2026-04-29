# Financed

> Reprenez le contrôle de chaque ligne de votre relevé bancaire — sans connexion bancaire, sans IA tape-à-l'œil, sans promesse intenable.

Application web premium de mise en ordre, lettrage et analyse intelligente de relevés bancaires personnels. Voir [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) pour le PRD complet.

## Stack

- **Framework :** Next.js 15 (App Router) + TypeScript strict
- **UI :** Tailwind CSS
- **Base de données :** Supabase (Postgres + Auth + RLS)
- **LLM (V1.5) :** Anthropic Claude Sonnet 4.6 via API routes Next.js

## Pré-requis

- Node.js 20+ (testé sur 24)
- npm 10+
- Un projet Supabase (free tier suffit) en région UE

## Setup local

```bash
# 1. Cloner
git clone https://github.com/CedricRoska/Financed.git
cd Financed

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Édite .env.local avec tes credentials Supabase
# (Settings → API dans le dashboard Supabase)

# 4. Lancer en dev
npm run dev
```

L'application est accessible sur http://localhost:3000.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement (hot reload) |
| `npm run build` | Build de production |
| `npm run start` | Lance la build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript (sans emit) |
| `npm run format` | Formatage Prettier |

## Architecture

```
.
├── app/                    # Routes Next.js (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   └── supabase/           # Couche Supabase isolée (NFR23)
│       ├── client.ts       # Client browser
│       ├── server.ts       # Clients server + service_role
│       └── types.ts        # Types DB (régénérés en Goal 3)
├── _bmad-output/           # Artefacts BMAD (planning + implementation specs)
└── _bmad/                  # Configuration BMAD module
```

## Sécurité

- **Variables d'env** : `.env.local` est gitignoré. Ne commit jamais la clé service Supabase ni la clé Anthropic.
- **RLS** : toutes les tables Postgres sont protégées par Row-Level Security (Goal 3+).
- **Clé service Supabase** : utilisable uniquement depuis `lib/supabase/server.ts`. Le module `server-only` empêche techniquement l'import depuis un client component.

## Roadmap

- [x] **Foundation** — Next.js + Supabase wiring (ce repo, état actuel)
- [ ] **Auth** — pages signup/login, sessions Supabase
- [ ] **Schéma initial** — tables `transactions`, `transaction_annotations`, RLS, types générés
- [ ] **Import CSV** — drag & drop, parsing Banque Populaire, sanity check
- [ ] **Vue mensuelle** — cards, compteur non-lettrées, score tricolore
- [ ] **Lettrage** — réconciliation 1-1 et 1-N, remboursement attendu persistant
- [ ] **V1.5** — copilote LLM saupoudré (chatbot, dashboards, classification)

Voir [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) pour le détail.

## Licence

Privé — usage personnel de l'auteur en V1.
