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
  - Postgres.app / Homebrew `postgresql@16`, or
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
src/middleware.ts        Route protection
src/lib/prisma.ts        Prisma singleton
src/lib/rbac.ts          requireUser / requireRole
src/lib/placeholders.ts  {{token}} resolution for section bodies
src/app/                 Routes (dashboard, login, api/*)
docs/                    ARCHITECTURE.md, ROADMAP.md
```

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is built and what is next.
