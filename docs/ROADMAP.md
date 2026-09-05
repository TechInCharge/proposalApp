# Roadmap

## Done — Scaffold (v0.1.0)

- Next.js + TypeScript + Tailwind project
- Prisma schema: users, products, section templates, customers, brand profiles,
  proposals, proposal products/sections, BoQ items
- Auth.js credentials login, `ADMIN` / `AUTHOR` roles, route middleware
- `requireUser` / `requireRole` helpers
- Placeholder resolver (`{{customer.name}}`, `{{proposal.date}}`, `{{boq.table}}`)
- Seed: admin user + sample product with 3 sections + default brand profile
- Dashboard shell, login page, health endpoint
- docker-compose Postgres, CI workflow

## Done — Phase 1 MVP (v0.2.0)

- [x] Products admin: list / create / edit / archive (ADMIN)
- [x] Section templates: full rich-text editor (formatting, colour, alignment,
      lists, links, image upload, tables), ordering, placeholder palette, versioning
- [x] Customers: list / create / edit, logo upload
- [x] Storage adapter (`src/lib/storage.ts`) — local disk now, S3 interface
- [x] Proposal builder workspace (Details / Products / Sections / BoQ / Generate)
  - [x] select products → snapshot their sections
  - [x] edit sections inline, include/exclude, reorder
  - [x] BoQ table (manual rows) with live totals
  - [x] preview + generate
- [x] Assembler: cover page + sections + BoQ table + header/footer
- [x] HTML renderer themed from BrandProfile
- [x] PDF export (Puppeteer) and DOCX export (@turbodocx/html-to-docx)
- [x] Download + regenerate; store artifacts on the proposal

## In progress — Phase 2

- [x] BrandProfile CRUD UI (done in Phase 1)
- [x] BoQ import from Excel/CSV (ExcelJS) — header-alias mapping, review before save
- [x] Proposal duplication (deep copy of details, products, sections, BoQ)
- [x] "Refresh sections from latest templates" — updates non-edited snapshots,
      adds new templates, reports edited/orphaned counts
- [x] Unit tests (Vitest) for `resolvePlaceholders`, `assembleProposalHtml`,
      `parseBoqBuffer`
- [x] Proposal contact fields — manual name/title/email/phone per proposal
      (no customer-contact picker, by design), "Attn:" on the cover,
      `{{contact.*}}` placeholders
- [x] **BoQ has no pricing at all** — went further than a toggle: removed
      `unit`, `unitPrice`, `showPricing`, `currency` entirely. BoQ rows are
      Part Number / Description / Quantity (integer) — that's the whole model.
- [x] **User management UI** (ADMIN) — create/edit/delete accounts, set
      ADMIN/AUTHOR role, reset a password. Previously the only way to create a
      user was the seed script. Guards: can't delete/demote yourself away from
      the last remaining admin, can't delete a user who has created proposals
      (friendly error instead of a raw FK violation), duplicate email handled.
- [ ] Playwright happy-path test

## Known gaps / tech debt

- `package.json#prisma` seed config is deprecated in Prisma 6.19 — migrate to
  `prisma.config.ts` before a Prisma 7 upgrade (Prisma 7 also drops `url` in the
  datasource block — needs a driver adapter).
- Section reorder is up/down buttons; wire real drag-and-drop.
- PDF generation runs in-process via Puppeteer. On serverless hosts switch to
  `puppeteer-core` + `@sparticuz/chromium` or a dedicated worker.
- `refreshProposalSections` never deletes orphaned snapshots — only reports them.
- `docToHtml` renders via `@tiptap/html/server` (happy-dom) rather than the
  browser build — required for server actions/serverless; keep it that way.
- The dev machine's file sync (iCloud/Dropbox/OneDrive) creates conflicted-copy
  duplicates (`name 2.ts`, `name 3.ts`, …) while editing. They're gitignored
  and excluded from `tsconfig.json`, but worth investigating at the OS level.

## Phase 3

- [ ] Cover-page designer
- [ ] Drag-and-drop section ordering across products

## Going live

Host chosen: **Railway** (persistent disk + normal Node process, so the app
deploys as-is — no storage or Puppeteer rework needed, unlike a serverless
host such as Vercel). See the "Deploy to Railway" section in the README for
the exact dashboard steps.

- [x] Deployment prep: `trustHost`, `nixpacks.toml` for Puppeteer's Chromium
      deps, `postinstall`/`start` scripts run `prisma generate` /
      `migrate deploy`, `PUPPETEER_EXECUTABLE_PATH` escape hatch (v0.8.0)
- [ ] Actually create the Railway project + Postgres addon + volume (manual —
      needs the user's Railway/GitHub login, see README)
- [ ] Real `AUTH_SECRET` (not the `.env.example` placeholder) set in Railway
- [ ] Change the seeded admin password (or replace it) after first deploy
- [ ] Database backup plan (Railway's Postgres has point-in-time restore on
      paid plans — confirm it's enabled)

## Not doing

Decided against, so future sessions don't re-suggest them:

- Section template diff view before refreshing a proposal's sections
- Review / approval workflow with comments
- PDF watermarking for drafts
- Multi-tenant support (org isolation, billing)
