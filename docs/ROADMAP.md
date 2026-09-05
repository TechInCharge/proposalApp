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
- [x] Section templates: TipTap editor, ordering, placeholder palette, versioning
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

## Going live (not started)

The app currently only runs locally (this laptop's Postgres + local disk for
files). Whenever real deployment is next:

- [ ] Pick a host (Vercel, a VPS, your own server) — decides the two items below
- [ ] Production Postgres (Neon, Supabase, RDS, or self-hosted)
- [ ] File storage: local disk (`src/lib/storage.ts`) is fine on a persistent
      server/container; a serverless host (e.g. Vercel functions) needs an
      S3-equivalent instead, since local disk doesn't persist there
- [ ] PDF generation on that host: Puppeteer works as-is on a normal
      server/container; serverless needs `puppeteer-core` + `@sparticuz/chromium`
- [ ] Real `AUTH_SECRET` (not the `.env.example` placeholder) and change the
      seeded admin password
- [ ] Database backup plan

## Not doing

Decided against, so future sessions don't re-suggest them:

- Section template diff view before refreshing a proposal's sections
- Review / approval workflow with comments
- PDF watermarking for drafts
- Multi-tenant support (org isolation, billing)
