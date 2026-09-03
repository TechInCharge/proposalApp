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
- [x] Pricing toggle + currency (done in Phase 1)
- [ ] Reusable customer-contact picker on the proposal
- [ ] Section template diff view (show what changed before refreshing)
- [ ] Taxes / discounts on the BoQ
- [ ] Playwright happy-path test

## Known gaps / tech debt

- `package.json#prisma` seed config is deprecated in Prisma 6.19 — migrate to
  `prisma.config.ts` before a Prisma 7 upgrade (Prisma 7 also drops `url` in the
  datasource block — needs a driver adapter).
- Section reorder is up/down buttons; wire real drag-and-drop.
- PDF generation runs in-process via Puppeteer. On serverless hosts switch to
  `puppeteer-core` + `@sparticuz/chromium` or a dedicated worker.
- `refreshProposalSections` never deletes orphaned snapshots — only reports them.

## Phase 3

- [ ] Cover-page designer
- [ ] Drag-and-drop section ordering across products
- [ ] Review / approval workflow, comments
- [ ] PDF watermarking for drafts
- [ ] Full multi-tenant option (org isolation, billing) — if needed
