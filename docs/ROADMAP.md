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

## Phase 2

- [ ] BrandProfile CRUD UI (colors, fonts, cover layout, header/footer, page numbers)
- [ ] BoQ import from Excel/CSV (ExcelJS)
- [ ] Reusable customer contacts; proposal duplication
- [ ] Section template versioning + diff; "update proposal from latest template"
- [ ] Pricing toggle, currency, totals, taxes

## Known gaps / tech debt

- Dashboard shows a "Products" card to AUTHOR users; it redirects to `/403`.
  Hide it or gate the link.
- `package.json#prisma` seed config is deprecated in Prisma 6.19 — migrate to
  `prisma.config.ts` before a Prisma 7 upgrade (Prisma 7 also drops `url` in the
  datasource block — needs a driver adapter).
- Section reorder is up/down buttons; wire real drag-and-drop.
- PDF generation runs in-process via Puppeteer. On serverless hosts switch to
  `puppeteer-core` + `@sparticuz/chromium` or a dedicated worker.
- No automated tests yet — add unit tests for `resolvePlaceholders` and
  `assembleProposalHtml`, plus a Playwright happy-path.

## Phase 3

- [ ] Cover-page designer
- [ ] Drag-and-drop section ordering across products
- [ ] Review / approval workflow, comments
- [ ] PDF watermarking for drafts
- [ ] Full multi-tenant option (org isolation, billing) — if needed
