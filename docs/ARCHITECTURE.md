# Architecture

## Domain model

```
User ─┬─ creates ─> Proposal
      └─ role: ADMIN | AUTHOR

Product ─< SectionTemplate        (ordered content chunks, .docx bodies + placeholders)

Customer ─< Proposal >─ BrandProfile
Proposal ─< ProposalProduct >─ Product      (selected products, ordered)
Proposal ─< ProposalSection                 (snapshot of SectionTemplate, per-proposal editable)
Proposal ─< BoqItem                          (bill of quantities line items)
```

Key rule: **editing a proposal never mutates a master `SectionTemplate`.** When
products are selected, each of their `SectionTemplate`s is copied into a
`ProposalSection` snapshot that the author edits freely.

`SectionTemplate.body` / `ProposalSection.body` / `BrandProfile.coverTemplate` /
`Proposal.coverTemplate` are all `Json` columns holding a `/api/files/...docx`
URL — a real Word document, authored in the SuperDoc editor
(`src/components/SectionEditorImpl.tsx`). Pre-migration rows may still hold a
plain HTML string (CKEditor era) or ProseMirror JSON (before that); there was
never a bulk migration script — both old formats are still read on demand
(`src/lib/render/section-html.ts`), by design (see the "Two rendering
pipelines" section below).

## Two rendering pipelines

There are deliberately **two separate paths** from stored content to output —
they are not the same code, and that's intentional, not leftover duplication:

### 1. Generation (`Proposal → Generate`) — `.docx`-native

```
Proposal + ProposalSections + BoqItems + BrandProfile
        │  (src/lib/render/load.ts::loadProposalInput)
        ▼
compose-proposal.ts
        │
        ├─ resolve cover + every section to real .docx bytes
        │    (section-docx.ts direct read; legacy HTML/ProseMirror content
        │     is converted to .docx on the fly via LibreOffice, no bulk
        │     migration required — section-html.ts + soffice.ts)
        ├─ resolve brand/customer logo images (image-size.ts)
        ├─ build the flat {{token}} -> value context
        ▼
compose-docx.ts :: composeProposalDocx()   (@superdoc/sdk, headless)
        │  fills {{tokens}}, inserts logo images, inserts/auto-appends
        │  the BoQ table, composes cover + sections into one document
        ▼
brand-docx.ts :: applyBrandColors()        (heading + BoQ-header coloring)
        │
        ├──> DOCX   saved directly
        └──> PDF    via headless LibreOffice (docx-to-pdf.ts)
        ▼
   saveFile() under STORAGE_DIR; Proposal.pdfUrl / docxUrl / generatedAt updated
```

One composed `.docx` is the source of truth for **both** downloads — the PDF
is a straight conversion of it, not a separately-built document, so the two
can't drift apart the way the old Puppeteer-HTML / html-to-docx-HTML pipeline
could.

**Known gap**: `BrandProfile.headerText` / `footerText` / `showPageNumbers`
are not applied by this pipeline yet — the old pipeline set these as
PDF/DOCX rendering *options*; the new PDF step has none to pass, and a real
fix needs baking a header/footer into the composed `.docx`'s own XML parts
(not yet investigated).

### 2. Live HTML preview (`/api/proposals/[id]/preview`) — HTML-native, unchanged

```
Proposal + ProposalSections + BoqItems + BrandProfile
        │  (src/lib/render/load.ts::loadAndAssemble)
        ▼
assemble.ts :: assembleProposalHtml()
        │  buildContext() -> resolvePlaceholdersInHtml() -> themed HTML
        │  (section bodies read via section-html.ts::sectionBodyToHtml —
        │   a .docx body is bridged to HTML via LibreOffice for this route
        │   only; ProseMirror JSON goes through tiptap.ts's server renderer)
        ▼
   returned directly as text/html
```

This route was deliberately left as-is during the SuperDoc migration — it's
lower-risk to keep one known-working HTML renderer for a live preview than to
rebuild it on the composer too. Puppeteer and `@turbodocx/html-to-docx`
(the old *output* engines) are gone; this route only ever produced HTML, so
it needed no equivalent replacement.

## Auth

- Auth.js v5, JWT session strategy (required by the Credentials provider).
- `role` is carried on the JWT and exposed on `session.user.role`.
- `src/proxy.ts` (Next's current name for what used to be `middleware.ts`)
  gates all routes except `/login`, `/api/auth/*`, `/api/health`, `/403`.
- Server components/actions use `requireUser()` / `requireRole("ADMIN")`.

## Storage

- Local dev: files under `STORAGE_DIR` (`./.storage`, git-ignored).
- Production (Railway): a mounted volume at `/data`, `STORAGE_DIR=/data/storage`
  — without it, uploaded logos and generated files disappear on redeploy.
- `src/lib/storage.ts` is a small local-disk adapter (`saveFile`/`readBuffer`/
  `readFile`/`toDataUri`); swap its implementation for an S3-compatible client
  if a non-persistent-filesystem host is ever used instead.

## Deployment

- Targeted host: **Railway** (`nixpacks.toml`, `npm start` runs
  `prisma migrate deploy` first). See the README's Deploy section for the
  step-by-step.
- DB: managed Postgres.
- `nixpacks.toml` installs LibreOffice headless (`libreoffice-writer`) —
  needed by the generation pipeline above and by the preview route's docx
  bridge. **Not yet validated against an actual Railway build** — only
  tested locally on macOS so far.
- Licensed under the **GNU AGPLv3** (`LICENSE`) — the in-app footer links to
  the license and to the exact commit a given deploy was built from
  (`RAILWAY_GIT_COMMIT_SHA`, read server-side).
