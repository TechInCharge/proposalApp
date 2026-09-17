/** Client-safe cover constants (no server-only imports). */

export const COVER_PLACEHOLDERS = [
  "proposal.title",
  "proposal.date",
  "proposal.reference",
  "customer.name",
  "customer.website",
  "customer.logo",
  "brand.logo",
  "contact.name",
  "contact.title",
  "contact.email",
  "contact.phone",
] as const;

/**
 * A starting point offered in the editor ("Load default layout") — a real
 * .docx, built once and saved at this fixed storage path (not a random
 * UUID) so this constant can point at it directly. Built by
 * scripts/build-default-cover.ts; regenerate + re-save at the same filename
 * to change it.
 */
export const DEFAULT_COVER_TEMPLATE_URL = "/api/files/defaults/cover-template.docx";
