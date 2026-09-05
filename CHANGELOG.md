# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Generation no longer fails with "Invalid base64 string" after pasting
  images into a section.** Pasted images arrive as `data:` URIs; the DOCX
  writer throws unless the URI is a clean single-line `data:<simple-mime>;base64,…`
  (a payload with newlines, a MIME type with digits/dots, a percent-encoded
  SVG, or a `blob:` URL all broke it). New `src/lib/render/images.ts`:
  `sanitizeContentImages` repairs/normalises every `<img>` at render time
  (re-encodes the payload, sniffs the real type, drops the undecodable);
  `offloadDataUriImages` runs on section save, writing pasted images to
  storage and swapping in `/api/files/…` URLs so base64 blobs never reach the
  database. Existing sections with a broken paste now generate fine, and are
  cleaned permanently on the next save.
- **Generated DOCX now tracks the PDF/HTML formatting.** The DOCX writer
  (`@turbodocx/html-to-docx`) ignores `<style>` blocks and only reads inline
  styles, so feeding it the PDF's stylesheet-driven HTML produced an unstyled
  document. Added a dedicated DOCX assembler (`assemble-docx.ts`) that resolves
  brand colours to literals, pushes every visual rule inline, unwraps
  CKEditor's `<figure>` wrappers, and gives tables real borders — cover,
  headings, colour, tables and the branded BoQ table now carry over. The base
  document font follows the brand profile. (Word has no equivalent for the
  gray section cards / rounded corners, so those don't appear.)

### Added

- **Reusable BoQ library.** Items added to any proposal's Bill of Quantities
  are auto-saved to a shared library on Save. The BoQ tab has an **Add from
  library** picker (search by part number or description) so you pick an
  existing item instead of retyping it; quantity stays per-proposal. New
  **BoQ Library** admin page (`/boq-items`, in the top nav) to search,
  rename and delete library entries — editing there does not touch proposals
  that already used an item. New `BoqCatalogItem` model, unique on
  `(partNumber, description)`; additive migration.

### Changed

- **Section editor is now CKEditor 5** (replacing TipTap). Word-style toolbar:
  paragraph/H1–H4, font family/size, text colour + background + highlight,
  **bold/italic/underline/strikethrough/code/super-/subscript**, alignment,
  indent, bullet & numbered lists, block quote, code block, horizontal line,
  **page break**, special characters, links (with "open in new tab"),
  **image upload** (button, paste or drag — stored server-side, embedded as
  base64 in the generated PDF/DOCX), **tables** with table & cell properties
  and captions, plus **find & replace**, **remove format**, **paste from
  Word/Google Docs** clean-up, and a source-view.
- **Section bodies are stored as HTML strings** instead of ProseMirror JSON.
  The `body` column stays `Json` (a string is valid JSON) — no migration.
  Output is whitelist-sanitised (`src/lib/render/sanitize.ts`) before it is
  stored or rendered. Placeholder resolution runs on the HTML
  (`resolvePlaceholdersInHtml`); `{{tokens}}` and `{{boq.table}}` still work,
  including inside table cells.
- Rows created in the old editor keep rendering (a legacy ProseMirror→HTML
  path); `scripts/migrate-section-bodies.ts` converts them permanently
  (`npx tsx scripts/migrate-section-bodies.ts`, and once more via
  `railway run` against production).
- Editor image upload moved from a Server Action to `POST /api/editor/upload`
  (CKEditor's upload adapter needs a URL endpoint).

### Fixed

- The React 19 "temporary client reference / `Cannot access toStringTag`"
  crash when saving a section with a table is gone: an HTML string serialises
  cleanly across the Server Action boundary, so the deep-clone workaround is
  no longer needed.

## [0.8.0] - 2026-09-05

### Added

- Deployment prep for Railway (and any similar host): `trustHost: true` in
  Auth.js, `nixpacks.toml` for Puppeteer's Chromium runtime libraries,
  `postinstall: prisma generate`, `start` now runs `prisma migrate deploy`
  first, `PUPPETEER_EXECUTABLE_PATH` override, and a step-by-step deploy guide
  in the README.

## [0.7.0] - 2026-09-05

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
