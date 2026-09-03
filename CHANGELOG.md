# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
