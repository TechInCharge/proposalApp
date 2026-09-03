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

## Phase 1 — MVP

- [ ] Products admin: list / create / edit / archive (ADMIN)
- [ ] Section templates: TipTap editor, ordering, placeholder palette, versioning
- [ ] Customers: list / create / edit, logo upload
- [ ] Storage adapter (`src/lib/storage.ts`) — local disk now, S3 interface
- [ ] Proposal builder wizard:
  - [ ] step 1 — title, customer, brand profile, date, reference
  - [ ] step 2 — select products (ordered), snapshot their sections
  - [ ] step 3 — edit sections inline, include/exclude, reorder
  - [ ] step 4 — BoQ table (manual rows)
  - [ ] step 5 — preview + generate
- [ ] Assembler: cover page + sections + BoQ table + header/footer
- [ ] HTML renderer themed from BrandProfile
- [ ] PDF export (Puppeteer) and DOCX export (html-to-docx)
- [ ] Download + regenerate; store artifacts on the proposal

## Phase 2

- [ ] BrandProfile CRUD UI (colors, fonts, cover layout, header/footer, page numbers)
- [ ] BoQ import from Excel/CSV (ExcelJS)
- [ ] Reusable customer contacts; proposal duplication
- [ ] Section template versioning + diff; "update proposal from latest template"
- [ ] Pricing toggle, currency, totals, taxes

## Phase 3

- [ ] Cover-page designer
- [ ] Drag-and-drop section ordering across products
- [ ] Review / approval workflow, comments
- [ ] PDF watermarking for drafts
- [ ] Full multi-tenant option (org isolation, billing) — if needed
