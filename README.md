# ProposalBuilder

Web app for assembling **technical proposals** from reusable, per-product section
templates. Pick the products for a deal, add customer details + a Bill of
Quantities, and the tool generates one branded proposal document (DOCX + PDF).

## Stack

- **Next.js (App Router) + TypeScript**
- **PostgreSQL + Prisma**
- **Auth.js (NextAuth v5)** — credentials login, roles `ADMIN` / `AUTHOR`
- **TipTap** rich-text editor — section templates stored as ProseMirror JSON
- **DOCX + PDF** generation server-side (pipeline added in Phase 1)
- Tailwind CSS

## Prerequisites

- Node 20+ (tested on 24)
- A PostgreSQL 14+ database. Options for local dev:
  - `docker compose up -d` (uses `docker-compose.yml`), or
  - Homebrew: `brew install postgresql@16 && brew services start postgresql@16`,
    then create the role + db:
    ```bash
    createuser proposal --createdb --pwprompt   # password: proposal
    createdb -O proposal proposalbuilder
    ```
    (`--createdb` is required — Prisma Migrate needs a shadow database.)
  - a free cloud DB (Neon, Supabase) — put its URL in `.env`

## Setup

```bash
cp .env.example .env          # then set DATABASE_URL and AUTH_SECRET
npx auth secret               # writes AUTH_SECRET into .env
npm install
npm run db:migrate            # create schema
npm run db:seed               # admin@example.com / admin1234 + sample data
npm run dev
```

Open http://localhost:3000 and sign in with the seeded admin account.

Add teammates from the app itself: **Users** in the nav (admin only) →
**New user**. There's no other way to create an account — the seed script
only ever creates the one bootstrap admin.

## Deploy to Railway

The app deploys as-is — no code changes needed beyond what's already in the
repo (`nixpacks.toml` gives Puppeteer's Chromium the system libraries it
needs to launch; `npm start` runs `prisma migrate deploy` before serving).

1. **New Project** on [railway.app](https://railway.app) → **Deploy from GitHub repo** → pick this repo.
2. **+ New** → **Database** → **Add PostgreSQL**. Railway sets that service's
   `DATABASE_URL`; reference it from the app service's variables as
   `${{Postgres.DATABASE_URL}}` (Railway's variable-reference syntax) so it
   always points at the right instance.
3. On the app service → **Variables**, add:
   - `AUTH_SECRET` — generate a fresh one (`openssl rand -base64 33`); **do not
     reuse** the value from your local `.env`
   - `AUTH_TRUST_HOST` = `true`
   - `AUTH_URL` — the app's public Railway URL (Settings → Networking →
     Generate Domain gives you this first; circle back and set it once you
     have it)
   - `STORAGE_DIR` = `/data/storage`
4. **Settings → Volumes** → add a volume mounted at `/data`. Without this,
   uploaded logos and generated DOCX/PDF files disappear on the next deploy.
5. **Settings → Networking → Generate Domain** for a public URL (or attach
   your own domain here). Set that URL as `AUTH_URL` (step 3) if you haven't
   already.
6. Deploy. First deploy takes a few minutes (Puppeteer downloads Chromium
   during `npm install`).
7. Create the first account: Railway dashboard → app service → **Command**
   (one-off shell) → `npm run db:seed`. This also creates a demo product and
   a default brand profile — fine to keep, edit, or archive the demo product
   from the app once you're in. Sign in as `admin@example.com` / `admin1234`
   and **immediately** change that password (Users → Admin → set a new
   password), or create your own admin from **Users** and delete the seeded
   one.

If PDF generation ever fails to launch Chromium on Railway, set
`PUPPETEER_EXECUTABLE_PATH` (see `.env.example`) rather than redeploying code.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed admin + sample product |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate, re-seed |

## Layout

```
prisma/schema.prisma     Data model (users, products, templates, proposals, BoQ, branding)
prisma/seed.ts           Seed script
src/auth.ts              Auth.js config
src/proxy.ts             Route protection
src/lib/prisma.ts        Prisma singleton
src/lib/rbac.ts          requireUser / requireRole
src/lib/placeholders.ts  {{token}} resolution for section bodies
src/app/                 Routes (dashboard, login, api/*)
docs/                    ARCHITECTURE.md, ROADMAP.md
```

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is built and what is next.
