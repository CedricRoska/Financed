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

# 4. Configurer Supabase Auth (étape obligatoire en V1)
# Dashboard Supabase → Authentication → Sign In / Up → Email
# → décoche "Confirm email" pour permettre signup → connection immédiate.
# (Sera réactivé à l'ouverture publique V2 avec un flow callback dédié.)

# 5. Appliquer la migration de schéma initiale
# Voir section "Database setup" ci-dessous.

# 6. Lancer en dev
npm run dev
```

L'application est accessible sur http://localhost:3000.

À la première utilisation, tu seras redirigé vers `/login`. Crée un compte via `/signup` puis connecte-toi.

## Database setup

V1 n'utilise pas le CLI Supabase. Les migrations sont appliquées **manuellement** via le SQL editor du dashboard, et les types TypeScript sont maintenus à la main dans [`lib/supabase/types.ts`](lib/supabase/types.ts).

### Appliquer une migration

1. Ouvrir le dashboard Supabase → ton projet → **SQL editor**
2. Cliquer **New query**
3. Coller intégralement le contenu du fichier de migration concerné (par exemple [`supabase/migrations/0001_init_schema.sql`](supabase/migrations/0001_init_schema.sql))
4. Cliquer **Run** (ou Ctrl+Enter)
5. Vérifier dans **Database → Tables** que les tables attendues apparaissent avec le cadenas RLS

Les migrations sont **idempotentes** (`CREATE TABLE IF NOT EXISTS` + `DROP POLICY IF EXISTS` partout) — les ré-appliquer en cas d'incident est safe.

### Évolution de schéma

À chaque nouvelle migration : ajouter un fichier numéroté dans `supabase/migrations/` (par ex. `0002_add_categories.sql`), l'appliquer via le dashboard, et mettre à jour [`lib/supabase/types.ts`](lib/supabase/types.ts) pour rester synchronisé avec le schéma réel.

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
│       └── types.ts        # Types DB (synchro manuelle avec migrations)
├── _bmad-output/           # Artefacts BMAD (planning + implementation specs)
└── _bmad/                  # Configuration BMAD module
```

## Sécurité

- **Variables d'env** : `.env.local` est gitignoré. Ne commit jamais la clé service Supabase ni la clé Anthropic.
- **RLS** : toutes les tables Postgres sont protégées par Row-Level Security (Goal 3+).
- **Clé service Supabase** : utilisable uniquement depuis `lib/supabase/server.ts`. Le module `server-only` empêche techniquement l'import depuis un client component.

## Roadmap

- [x] **Foundation** — Next.js + Supabase wiring
- [x] **Auth** — pages signup/login, sessions Supabase, middleware protection
- [x] **Schéma initial** — tables `accounts`, `transactions`, `transaction_annotations`, `audit_log` + RLS
- [ ] **Import CSV** — drag & drop, parsing Banque Populaire, sanity check, dédup hash
- [ ] **Vue mensuelle** — cards, compteur non-lettrées, score tricolore
- [ ] **Lettrage** — réconciliation 1-1 et 1-N, remboursement attendu persistant
- [ ] **V1.5** — copilote LLM saupoudré (chatbot, dashboards, classification)

Voir [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) pour le détail.

## Licence

Privé — usage personnel de l'auteur en V1.
