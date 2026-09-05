# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **User management** (ADMIN): create, edit, and delete accounts; set the
  ADMIN/AUTHOR role; reset a password. Previously the only way to create a
  user was the seed script. Guards against removing the last administrator
  (by delete or by demotion), against deleting yourself, against deleting a
  user who has created proposals (friendly error, not a raw FK violation),
  and against duplicate emails.

## [0.6.0] - 2026-09-05

### Added

- **seclore.com-inspired theme**, applied to both the platform UI and
  generated proposals: Inter typeface, an indigo/violet brand accent
  (`#5636CE`), near-black headings, light-gray rounded cards. New
  `BrandProfile` colour defaults. Generated PDFs now embed the real Inter
  font (base64 variable woff2) instead of silently falling back to Arial —
  Puppeteer waits on `document.fonts.ready` before printing.

### Changed

- **BoQ simplified to Part Number, Description, Quantity only.** Removed
  `unit`, `unitPrice`, and `Proposal.showPricing`/`currency` entirely — this
  tool produces technical proposals without commercial terms, so there's no
  pricing concept to toggle. `quantity` is now a plain integer. BoQ import,
  the BoQ table UI, and the rendered table (PDF/DOCX/HTML) all dropped the
  removed columns.

## [0.4.0] - 2026-09-05

### Added

- **Proposal contact fields** — name/title/email/phone entered manually per
  proposal (Details tab), rendered as "Attn: <name>, <title>" on the cover
  page, and available as `{{contact.name}}` / `{{contact.title}}` /
  `{{contact.email}}` / `{{contact.phone}}` in section text. Copied by
  proposal duplication.

### Fixed

- **Section bodies could render empty in DOCX/PDF outside `next dev`** (server
  actions on some hosts, standalone scripts, serverless): `docToHtml` used the
  browser build of `@tiptap/html`, which throws without a `window`, and the
  error was swallowed. Switched to `@tiptap/html/server` (happy-dom backed); a
  genuine render failure now shows a visible placeholder instead of nothing.
- New proposals default `showPricing` to **false** — a technical proposal
  ships without prices; pricing belongs in a separate commercial quote. Still
  a per-proposal toggle on the Details tab.

## [0.3.0] - 2026-09-04

### Added

- **BoQ import** from `.xlsx` / `.csv` — headers matched by common aliases
  (part no / qty / unit / unit price), parsed server-side with ExcelJS, rows
  land in the editable table for review before saving
- **Duplicate proposal** — deep copy of details, product links, section
  snapshots and BoQ (not the generated files)
- **Refresh sections from latest templates** — overwrites non-edited snapshots
  from their source template, appends newly added templates, keeps edited ones,
  and reports how many are orphaned
- Vitest unit tests: `resolvePlaceholders`, `assembleProposalHtml`,
  `parseBoqBuffer` (`npm test`)

### Fixed

- Dashboard no longer shows the admin-only "Products" card to AUTHOR users

## [0.2.0] - 2026-09-04

### Added

- **Products admin** (ADMIN): list, create, edit, archive/unarchive
- **Section templates**: TipTap rich-text editor with a placeholder palette,
  add / edit / delete / reorder, automatic placeholder extraction, versioning
- **Customers**: list, create, edit, contacts, logo upload
- **Brand profiles**: colours, font, cover layout, header/footer, page numbers,
  single-default enforcement
- **Proposal builder** workspace with tabs:
  - Details (title, customer, brand profile, date, reference, pricing, currency,
    status)
  - Products — selecting a product snapshots its section templates into the
    proposal; deselecting removes them
  - Sections — include/exclude, reorder, inline rich-text editing per proposal
  - BoQ — editable line-item table with live totals
  - Generate — one click produces **DOCX + PDF**, plus a live HTML preview
- **Generation pipeline**: `buildContext` → `resolvePlaceholders` → assemble
  (themed cover page, ordered sections, `{{boq.table}}` or an auto-appended
  Bill of Quantities) → Puppeteer PDF + `@turbodocx/html-to-docx` DOCX, stored
  and linked on the proposal
- Local-disk **storage adapter** with an authenticated `/api/files/*` route
- Shared UI primitives, `(app)` route group with nav + auth guard
- Timezone-safe date handling for proposal dates

### Changed

- `src/middleware.ts` renamed to `src/proxy.ts` (Next 16.3 convention)
- `/api/health` is now public (for load balancers / CI)

## [0.1.0] - 2026-09-04

### Added

- Project scaffold: Next.js (App Router) + TypeScript + Tailwind
- Prisma schema for users, products, section templates, customers, brand
  profiles, proposals, proposal products/sections, and BoQ items
- Auth.js (NextAuth v5) credentials login with `ADMIN` / `AUTHOR` roles
- Route protection via `src/proxy.ts` and `requireUser` / `requireRole` helpers
- `{{token}}` placeholder resolver for section bodies
- Seed script (admin user, sample product with sections, default brand profile)
- Dashboard shell, login page, `/api/health`
- docker-compose Postgres and GitHub Actions CI
