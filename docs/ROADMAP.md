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
- [x] Section templates: CKEditor 5 rich-text editor (formatting, fonts,
      colour, alignment, indent, lists, links, image upload, tables + cell
      properties, page break, find & replace, paste-from-Word, source view),
      ordering, placeholder palette, versioning. Bodies stored as sanitised
      HTML strings.
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
- [x] **Reusable BoQ library** — `BoqCatalogItem` (shared, unique on
      `(partNumber, description)`). `saveBoq` auto-captures rows into it;
      BoQ tab has an "Add from library" search-picker; `/boq-items` ADMIN
      page curates it. Proposal `BoqItem` rows stay independent snapshots.
- [ ] Playwright happy-path test

## Known gaps / tech debt

- `package.json#prisma` seed config is deprecated in Prisma 6.19 — migrate to
  `prisma.config.ts` before a Prisma 7 upgrade (Prisma 7 also drops `url` in the
  datasource block — needs a driver adapter).
- Section reorder is up/down buttons; wire real drag-and-drop.
- `refreshProposalSections` never deletes orphaned snapshots — only reports them.
- `docToHtml` (`@tiptap/html/server`) + the `@tiptap/*` deps stay
  **indefinitely** now (not a temporary fallback pending a migration script —
  see Phase 4 above, there is deliberately no such script) as long as any
  `SectionTemplate`/`ProposalSection`/cover row can still hold pre-CKEditor
  ProseMirror JSON or CKEditor-era HTML. Both the live HTML preview and
  generation's legacy-content fallback depend on this.
- The dev machine's file sync (iCloud/Dropbox/OneDrive) creates conflicted-copy
  duplicates (`name 2.ts`, `name 3.ts`, …) while editing. They're gitignored
  and excluded from `tsconfig.json`, but worth investigating at the OS level.

## Phase 3

- [x] Cover-page designer — rich cover template on the BrandProfile (+ a
      per-proposal override), `{{placeholders}}` incl. `{{customer.logo}}` /
      `{{brand.logo}}`, rendered in PDF + DOCX via `src/lib/render/cover.ts`.
      Empty template ⇒ the built-in auto cover.
- [ ] Drag-and-drop section ordering across products
- [ ] Wire the `coverLayout` enum (standard/minimal/full-bleed) into the auto
      cover, or retire it now that custom templates exist.

## Done — Phase 4: SuperDoc migration (Unreleased)

Full write-up and findings: `/Users/djenane/.claude/plans/abundant-rolling-dawn.md`.

- [x] Section templates and cover pages both moved from CKEditor 5 (HTML) to
      SuperDoc (`@superdoc/sdk`/`@superdoc/react`) — real `.docx` files,
      edited in a Word-grade editor. `{{token}}` placeholders unchanged.
      Deliberately **no bulk migration** of existing content (explicit
      choice) — old rows keep rendering via an on-the-fly LibreOffice bridge.
- [x] Generation (`generateProposal`) rebuilt on a single composed `.docx`
      (`compose-docx.ts` + `brand-docx.ts`) converted to PDF via headless
      LibreOffice, replacing Puppeteer + `@turbodocx/html-to-docx` entirely.
      PDF and DOCX now come from the same source document.
- [x] Licensed under the **GNU AGPLv3** (`LICENSE` + footer link to the
      license and the exact source commit a deploy was built from).
- [x] Dead-code removal: CKEditor, Puppeteer, `@turbodocx/html-to-docx`, and
      everything only they used.
- [ ] Validate the LibreOffice pipeline (`railpack.json`) against an actual
      Railway build — only tested locally (macOS) so far. Note: the
      project's Railway service uses the **Railpack** builder, not
      Nixpacks — an earlier `nixpacks.toml` was silently never read;
      corrected to `railpack.json` (`deploy.aptPackages`), the config
      Railpack actually applies.
- [ ] Header/footer text + page numbers (`BrandProfile.headerText`/
      `footerText`/`showPageNumbers`) — not applied by the new generation
      pipeline yet; the old one set these as PDF/DOCX rendering options that
      have no equivalent yet in the new one. Needs the SuperDoc SDK's
      header/footer API investigated (present in its types, unvalidated).
- [ ] Tag the first real Railway deploy (`git tag vX.Y.Z`, pushed) — AGPL
      §13 wants the exact version a user is interacting with fetchable.

## Going live

Host chosen: **Railway** (persistent disk + normal Node process, so the app
deploys as-is — no storage rework needed, unlike a serverless host such as
Vercel). See the "Deploy to Railway" section in the README for the exact
dashboard steps.

- [x] Deployment prep: `trustHost`, `postinstall`/`start` scripts run
      `prisma generate` / `migrate deploy` (v0.8.0); `railpack.json` now
      provisions LibreOffice instead of Puppeteer's Chromium deps (Phase 4,
      see above — not yet validated on an actual Railway build)
- [x] Railway project (`dynamic-energy`), Postgres, and a volume
      (`proposalapp-volume`) already exist and are online — service is
      `proposalApp` on the `main` branch, `AUTH_SECRET`/`AUTH_TRUST_HOST`/
      `AUTH_URL`/`DATABASE_URL`/`STORAGE_DIR` all already set. **Was already
      live** at `proposalapp-production.up.railway.app` running the
      pre-migration (CKEditor/Puppeteer) build before Phase 4 — this
      roadmap's earlier "nothing is deployed yet" framing was stale.
- [ ] Change the seeded admin password (or replace it) after first deploy
- [ ] Database backup plan (Railway's Postgres has point-in-time restore on
      paid plans — confirm it's enabled)

## Not doing

Decided against, so future sessions don't re-suggest them:

- Section template diff view before refreshing a proposal's sections
- Review / approval workflow with comments
- PDF watermarking for drafts
- Multi-tenant support (org isolation, billing)
