# Architecture

## Domain model

```
User ─┬─ creates ─> Proposal
      └─ role: ADMIN | AUTHOR

Product ─< SectionTemplate        (ordered content chunks, ProseMirror JSON + placeholders)

Customer ─< Proposal >─ BrandProfile
Proposal ─< ProposalProduct >─ Product      (selected products, ordered)
Proposal ─< ProposalSection                 (snapshot of SectionTemplate, per-proposal editable)
Proposal ─< BoqItem                          (bill of quantities line items)
```

Key rule: **editing a proposal never mutates a master `SectionTemplate`.** When
products are selected, each of their `SectionTemplate`s is copied into a
`ProposalSection` snapshot that the author edits freely.

## Generation pipeline (Phase 1)

```
Proposal + ProposalSections + BoqItems + BrandProfile
        │
        ▼
1. buildContext()              customer/proposal values
2. resolvePlaceholders()       {{token}} -> values; detect {{boq.table}} block tokens
3. assemble document model     cover page + ordered sections + BoQ table + header/footer
        │
        ├── render HTML (themed with BrandProfile CSS vars)
        │        ├──> PDF   via headless Chromium (Puppeteer)
        │        └──> DOCX  via html-to-docx (or a native `docx` builder)
        ▼
   store under STORAGE_DIR / object storage; attach to Proposal
```

The PDF step needs a Chromium binary. On Vercel use `@sparticuz/chromium` +
`puppeteer-core`, or run the render step on a separate worker (Railway/Fly/Render).

## Auth

- Auth.js v5, JWT session strategy (required by the Credentials provider).
- `role` is carried on the JWT and exposed on `session.user.role`.
- `src/middleware.ts` gates all routes except `/login`, `/api/auth/*`, `/403`.
- Server components/actions use `requireUser()` / `requireRole("ADMIN")`.

## Storage

- Local dev: files under `STORAGE_DIR` (`./.storage`, git-ignored).
- Production: S3-compatible bucket; swap the storage adapter in `src/lib/storage.ts`
  (to be added in Phase 1).

## Deployment

- App: Vercel or any Node host.
- DB: managed Postgres (Neon/Supabase/RDS).
- PDF worker: separate service if the host lacks a writable Chromium.
