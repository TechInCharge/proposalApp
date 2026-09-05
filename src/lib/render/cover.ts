import { buildContext, resolvePlaceholdersInHtml } from "@/lib/placeholders";
import { sanitizeSectionHtml } from "@/lib/render/sanitize";

/**
 * Cover page: a brand profile (and optionally a single proposal) can supply a
 * CKEditor HTML template with {{placeholders}}. When none is set the built-in
 * auto cover in the assemblers is used instead.
 */

export {
  COVER_PLACEHOLDERS,
  DEFAULT_COVER_TEMPLATE,
} from "@/lib/render/cover-constants";

export interface CoverData {
  title: string;
  proposalDate: Date;
  reference: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  customerName: string;
  customerWebsite: string | null;
  brandLogoDataUri: string | null;
  customerLogoDataUri: string | null;
}

/** Normalise a stored `Json` cover value to a usable HTML string, or null. */
export function coverTemplateString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  // An "empty" CKEditor document still serialises to <p>&nbsp;</p> etc.
  if (!trimmed || /^(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/** proposal override beats brand profile. */
export function pickCoverTemplate(
  proposalTemplate: unknown,
  brandTemplate: unknown,
): string | null {
  return coverTemplateString(proposalTemplate) ?? coverTemplateString(brandTemplate);
}

function replaceLogoToken(
  html: string,
  token: string,
  dataUri: string | null,
): string {
  const re = new RegExp(`\\{\\{\\s*${token.replace(".", "\\.")}\\s*\\}\\}`, "g");
  return html.replace(
    re,
    dataUri
      ? `<img src="${dataUri}" alt="" style="max-height:72px;max-width:100%" />`
      : "",
  );
}

/**
 * Resolve a custom cover template: sanitise, swap the logo image tokens for
 * `<img>` tags, then resolve the remaining {{tokens}}. Returns the inner HTML
 * (the assembler wraps it in the page frame).
 */
export function resolveCoverHtml(
  templateHtml: string,
  d: CoverData,
): { html: string; missing: string[] } {
  let html = sanitizeSectionHtml(templateHtml);
  html = replaceLogoToken(html, "customer.logo", d.customerLogoDataUri);
  html = replaceLogoToken(html, "brand.logo", d.brandLogoDataUri);

  const ctx = buildContext({
    customerName: d.customerName,
    customerWebsite: d.customerWebsite,
    proposalTitle: d.title,
    proposalDate: d.proposalDate,
    reference: d.reference,
    contactName: d.contactName,
    contactTitle: d.contactTitle,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
  });
  return resolvePlaceholdersInHtml(html, ctx);
}
