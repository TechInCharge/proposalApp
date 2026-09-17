import type { AssembleInput } from "@/lib/render/assemble";
import { pickCoverTemplate } from "@/lib/render/cover";
import { DEFAULT_COVER_TEMPLATE_URL } from "@/lib/render/cover-constants";
import { sectionBodyToDocxBuffer } from "@/lib/render/section-docx";
import { sectionBodyToHtml } from "@/lib/render/section-html";
import { convertWithSoffice } from "@/lib/render/soffice";
import { composeProposalDocx, type BoqRow, type ComposeDocxImage } from "@/lib/render/compose-docx";
import { applyBrandColors } from "@/lib/render/brand-docx";
import { logoInsertSize } from "@/lib/render/image-size";
import { readBuffer } from "@/lib/storage";

/**
 * Phase 4 entry point: builds the final proposal .docx directly via
 * compose-docx.ts + brand-docx.ts — this is what generate.ts calls. The
 * live HTML preview route (assemble.ts, via load.ts::loadAndAssemble) is a
 * separate, unrelated pipeline that still renders HTML directly.
 *
 * Known, deliberate scope boundary: header/footer text and page numbers
 * (BrandProfile.headerText/footerText/showPageNumbers) are not applied here.
 * The old pipeline set these as PDF/DOCX *rendering* options (Puppeteer page
 * headers, html-to-docx footer); the new pipeline's PDF is a straight
 * docx->pdf conversion (docx-to-pdf.ts) with nothing to pass options to, and
 * baking a real header/footer into the composed .docx itself needs its own
 * investigation into the SDK's header/footer story schema (present in its
 * types, not yet validated as a working recipe) — not attempted here. Worth
 * a follow-up once this core pipeline is confirmed working end-to-end.
 */

function storageKey(url: string): string {
  const m = url.match(/^\/api\/files\/(.+)$/);
  if (!m) throw new Error(`Not a storage URL: ${url}`);
  return m[1];
}

/**
 * Legacy (pre-SuperDoc) content — an HTML string or, via sectionBodyToHtml,
 * ProseMirror JSON — converted to .docx on the fly via LibreOffice so it can
 * still flow through compose-docx.ts. This is what lets "fresh sections"
 * (the user's explicit scope for this migration) and untouched legacy rows
 * coexist without a prior bulk migration script (Phase 3, not built).
 */
async function legacyHtmlToDocx(html: string): Promise<Buffer> {
  const wrapped = `<!DOCTYPE html><html><body>${html}</body></html>`;
  return convertWithSoffice(Buffer.from(wrapped, "utf-8"), "html", "docx:MS Word 2007 XML", "docx");
}

async function resolveCoverDocx(coverTpl: string | null): Promise<Buffer> {
  if (!coverTpl) return readBuffer(storageKey(DEFAULT_COVER_TEMPLATE_URL));
  const docx = await sectionBodyToDocxBuffer(coverTpl);
  if (docx) return docx;
  return legacyHtmlToDocx(await sectionBodyToHtml(coverTpl));
}

async function resolveSectionDocx(body: unknown): Promise<Buffer> {
  const docx = await sectionBodyToDocxBuffer(body);
  if (docx) return docx;
  return legacyHtmlToDocx(await sectionBodyToHtml(body));
}

async function loadLogoImage(url: string | null): Promise<ComposeDocxImage | null> {
  if (!url) return null;
  const m = url.match(/^\/api\/files\/(.+)$/);
  if (!m) return null;
  try {
    const buffer = await readBuffer(m[1]);
    return { buffer, ...logoInsertSize(buffer) };
  } catch {
    return null;
  }
}

function flatContext(input: AssembleInput): Record<string, string> {
  return {
    "customer.name": input.customer.name,
    "customer.website": input.customer.website ?? "",
    "proposal.title": input.proposal.title,
    "proposal.date": input.proposal.proposalDate.toISOString().slice(0, 10),
    "proposal.reference": input.proposal.reference ?? "",
    "contact.name": input.proposal.contactName ?? "",
    "contact.title": input.proposal.contactTitle ?? "",
    "contact.email": input.proposal.contactEmail ?? "",
    "contact.phone": input.proposal.contactPhone ?? "",
  };
}

export interface ComposedProposal {
  docx: Buffer;
  missingTokens: string[];
}

/** Compose + brand a proposal's final .docx from the same input shape the old HTML pipeline used. */
export async function composeProposalDocument(input: AssembleInput): Promise<ComposedProposal> {
  const coverTpl = pickCoverTemplate(input.proposal.coverTemplate, input.brand.coverTemplate);

  const [cover, sections, brandLogo, customerLogo] = await Promise.all([
    resolveCoverDocx(coverTpl),
    Promise.all(input.sections.map((s) => resolveSectionDocx(s.body))),
    loadLogoImage(input.brand.logoUrl),
    loadLogoImage(input.customer.logoUrl),
  ]);

  // A logo token with no actual logo available is resolved to "" like any
  // other empty token (removed, not left dangling) rather than treated as an
  // image — mirrors the old pipeline's replaceLogoToken behavior.
  const context = flatContext(input);
  const images: Record<string, ComposeDocxImage> = {};
  if (brandLogo) images["brand.logo"] = brandLogo;
  else context["brand.logo"] = "";
  if (customerLogo) images["customer.logo"] = customerLogo;
  else context["customer.logo"] = "";

  const boqRows: BoqRow[] = input.boqItems.map((b) => ({
    partNumber: b.partNumber,
    description: b.description,
    quantity: b.quantity,
  }));

  const { buffer, missingTokens } = await composeProposalDocx({ cover, sections, boqRows, context, images });
  const branded = await applyBrandColors(buffer, { primaryColor: input.brand.primaryColor.replace(/^#/, "") });

  return { docx: branded, missingTokens };
}
