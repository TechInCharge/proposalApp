/** Client-safe OnlyOffice constants and types (no server-only imports). */

/**
 * Which kind of row a live OnlyOffice editing session is bound to — every
 * document route (config/document/callback/force-save) is scoped to one of
 * these plus a row id. Only section templates and proposal sections are
 * migrated to OnlyOffice; the cover editor (BrandProfile/Proposal
 * coverTemplate) still runs on the SuperDoc-based SectionEditorImpl — it has
 * a materially different "row may not exist yet" + deferred-save design
 * (see BrandProfileForm.tsx's wantsAutoCover) that needs its own follow-up.
 */
export type OnlyOfficeDocKind = "section-template" | "proposal-section";

/**
 * Starting point for a brand-new section with no saved content yet.
 * OnlyOffice's editor config always needs a real document URL — unlike the
 * old SuperDoc editor, which could start with no `document` prop at all —
 * so "new" opens this near-empty .docx instead of nothing. Built by
 * scripts/build-blank-document.ts.
 */
export const BLANK_DOCUMENT_URL = "/api/files/defaults/blank.docx";
