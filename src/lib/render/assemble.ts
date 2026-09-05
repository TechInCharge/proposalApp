import { buildContext, resolvePlaceholdersInHtml } from "@/lib/placeholders";
import { sectionBodyToHtml } from "@/lib/render/section-html";
import { sanitizeContentImages } from "@/lib/render/images";
import { toDataUri } from "@/lib/storage";
import { interFontFaceCss } from "@/lib/render/fonts";

export interface AssembleInput {
  proposal: {
    title: string;
    proposalDate: Date;
    reference: string | null;
    contactName: string | null;
    contactTitle: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  customer: { name: string; website: string | null; logoUrl: string | null };
  brand: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    coverLayout: string;
    headerText: string | null;
    footerText: string | null;
    showPageNumbers: boolean;
  };
  sections: { id: string; title: string; body: unknown }[];
  // BoQ items carry no pricing — technical proposals here list what's being
  // delivered (typically license items), not commercial terms.
  boqItems: {
    partNumber: string | null;
    description: string;
    quantity: number;
  }[];
}

export interface AssembleResult {
  html: string;
  missingTokens: string[];
}

// Design reference: seclore.com — indigo/violet brand accent, near-black
// headings, Inter typeface. See src/app/globals.css for the same palette
// applied to the platform UI.
export const DEFAULT_BRAND: AssembleInput["brand"] = {
  logoUrl: null,
  primaryColor: "#5636CE",
  secondaryColor: "#1F2024",
  fontFamily: "Inter",
  coverLayout: "standard",
  headerText: "Technical Proposal",
  footerText: "Confidential",
  showPageNumbers: true,
};

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rich-text images are stored as `/api/files/…` URLs, which need a logged-in
 * session — the PDF renderer (Puppeteer) and the DOCX writer can't fetch them.
 * Inline every such image as a base64 data URI before handing HTML off.
 */
export async function inlineFileImages(html: string): Promise<string> {
  // Normalise/repair pasted <img> sources first — a malformed data: URI here
  // makes the DOCX writer throw "Invalid base64 string".
  html = sanitizeContentImages(html);

  const srcs = new Set<string>();
  const re = /<img\b[^>]*\bsrc="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1].startsWith("/api/files/")) srcs.add(m[1]);
  }
  if (srcs.size === 0) return html;
  const pairs = await Promise.all(
    [...srcs].map(async (s) => [s, await toDataUri(s)] as const),
  );
  let out = html;
  for (const [s, data] of pairs) {
    if (data) out = out.split(`src="${s}"`).join(`src="${data}"`);
  }
  return out;
}

function boqTableHtml(items: AssembleInput["boqItems"]): string {
  if (!items.length) return "<p><em>No items.</em></p>";
  const head = `<tr>${["#", "Part No.", "Description", "Qty"]
    .map((c) => `<th>${c}</th>`)
    .join("")}</tr>`;
  const rows = items
    .map((it, i) => {
      const cells = [
        String(i + 1),
        esc(it.partNumber ?? ""),
        esc(it.description),
        String(it.quantity),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");
  return `<table class="boq"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

export async function assembleProposalHtml(
  input: AssembleInput,
): Promise<AssembleResult> {
  const ctx = buildContext({
    customerName: input.customer.name,
    customerWebsite: input.customer.website,
    proposalTitle: input.proposal.title,
    proposalDate: input.proposal.proposalDate,
    reference: input.proposal.reference,
    contactName: input.proposal.contactName,
    contactTitle: input.proposal.contactTitle,
    contactEmail: input.proposal.contactEmail,
    contactPhone: input.proposal.contactPhone,
  });

  const missing = new Set<string>();
  const boqHtml = boqTableHtml(input.boqItems);

  let boqRendered = false;
  let sectionHtml = input.sections
    .map((s) => {
      const { html: resolved, missing: m } = resolvePlaceholdersInHtml(
        sectionBodyToHtml(s.body),
        ctx,
      );
      m.forEach((t) => missing.add(t));
      const body = resolved.replace(
        /<p>\s*\{\{\s*boq\.table\s*\}\}\s*<\/p>/gi,
        () => {
          boqRendered = true;
          return boqHtml;
        },
      );
      return `<section class="doc-section"><h2>${esc(s.title)}</h2>${body}</section>`;
    })
    .join("\n");
  sectionHtml = await inlineFileImages(sectionHtml);

  // If no section embedded the BoQ but items exist, append it as a final section.
  const boqSection =
    !boqRendered && input.boqItems.length
      ? `<section class="doc-section"><h2>Bill of Quantities</h2>${boqHtml}</section>`
      : "";

  const brandLogo = await toDataUri(input.brand.logoUrl);
  const custLogo = await toDataUri(input.customer.logoUrl);
  const dateStr = input.proposal.proposalDate.toISOString().slice(0, 10);

  const usesInter = input.brand.fontFamily.trim().toLowerCase() === "inter";
  const fontFaceCss = usesInter ? interFontFaceCss() : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaceCss}
    :root { --primary: ${esc(input.brand.primaryColor)}; --secondary: ${esc(
      input.brand.secondaryColor,
    )}; }
    * { box-sizing: border-box; }
    body { font-family: ${esc(
      input.brand.fontFamily,
    )}, Arial, sans-serif; color: #141414; margin: 0; font-size: 12px; line-height: 1.6; }
    .cover { min-height: 96vh; display: flex; flex-direction: column; justify-content: center;
      padding: 56px; page-break-after: always;
      background: linear-gradient(160deg, #ffffff 55%, color-mix(in srgb, var(--primary) 7%, white) 100%); }
    .cover .accent-bar { width: 56px; height: 6px; border-radius: 3px; background: var(--primary); margin-bottom: 28px; }
    .cover .logos { display: flex; gap: 32px; align-items: center; margin-bottom: 40px; }
    .cover img { max-height: 56px; }
    .cover .eyebrow { color: var(--primary); font-weight: 600; letter-spacing: 1.5px;
      text-transform: uppercase; font-size: 12px; margin-bottom: 10px; }
    .cover h1 { font-size: 34px; font-weight: 700; color: var(--secondary); margin: 0 0 8px;
      letter-spacing: -0.02em; }
    .cover .meta { color: #52525b; margin-top: 28px; font-size: 12.5px; }
    .cover .meta div { margin-bottom: 4px; }
    .content { padding: 36px 48px; }
    .doc-section { page-break-inside: avoid; margin-bottom: 18px; background: #fafafa;
      border-radius: 12px; padding: 18px 22px; }
    .doc-section h2 { color: var(--secondary); font-size: 15px; font-weight: 700; margin: 0 0 10px;
      padding-bottom: 8px; border-bottom: 2px solid var(--primary); }
    h1,h2,h3 { color: var(--secondary); font-weight: 700; }
    table.boq { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 11px;
      border-radius: 8px; overflow: hidden; border: 1px solid #e4e4e7; }
    table.boq th { background: var(--primary); color: #fff; text-align: left; padding: 8px 10px;
      font-weight: 600; }
    table.boq td { border-top: 1px solid #e4e4e7; padding: 8px 10px; background: #fff; }
    p { margin: 6px 0; }
    ul, ol { margin: 6px 0 6px 20px; }
    h4 { color: var(--secondary); font-weight: 700; font-size: 13px; margin: 10px 0 4px; }
    /* rich-text content authored in the CKEditor section editor */
    .doc-section a { color: var(--primary); text-decoration: underline; }
    .doc-section figure { margin: 10px 0; }
    .doc-section img { max-width: 100%; height: auto; border-radius: 6px; page-break-inside: avoid; }
    .doc-section figure.image { text-align: center; }
    .doc-section figure.image img { display: inline-block; }
    .doc-section figure.image > figcaption { font-size: 10px; color: #64748b; text-align: center; margin-top: 4px; }
    .doc-section figure.image.image-style-align-left { float: left; margin: 4px 16px 8px 0; max-width: 50%; }
    .doc-section figure.image.image-style-align-right,
    .doc-section figure.image.image-style-side { float: right; margin: 4px 0 8px 16px; max-width: 50%; }
    .doc-section figure.image.image-style-align-center { margin-left: auto; margin-right: auto; }
    .doc-section figure.image.image_resized { max-width: 100%; }
    .doc-section blockquote { border-left: 3px solid var(--primary); margin: 8px 0; padding-left: 12px; color: #475569; }
    .doc-section pre { background: #f1f5f9; border-radius: 6px; padding: 10px 12px; overflow-x: auto; font-size: 10.5px; }
    .doc-section code { background: #f1f5f9; border-radius: 4px; padding: 1px 4px; }
    .doc-section pre code { background: none; padding: 0; }
    .doc-section hr { border: 0; border-top: 1px solid #cbd5e1; margin: 10px 0; }
    .doc-section mark { border-radius: 3px; padding: 0.05em 0.15em; }
    .doc-section .marker-yellow { background: #fdfd77; }
    .doc-section .marker-green { background: #7ee686; }
    .doc-section .marker-pink { background: #fc7899; }
    .doc-section .marker-blue { background: #72cdfd; }
    .doc-section .pen-red { color: #e71313; }
    .doc-section .pen-green { color: #128a00; }
    .doc-section .text-tiny { font-size: 0.7em; }
    .doc-section .text-small { font-size: 0.85em; }
    .doc-section .text-big { font-size: 1.4em; }
    .doc-section .text-huge { font-size: 1.8em; }
    .doc-section .page-break { page-break-after: always; }
    .doc-section .page-break__label { display: none; }
    .doc-section table:not(.boq) {
      border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 11px; table-layout: auto;
    }
    .doc-section figure.table { overflow-x: auto; }
    .doc-section table:not(.boq) th, .doc-section table:not(.boq) td {
      border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top;
    }
    .doc-section table:not(.boq) th { background: #f1f5f9; font-weight: 600; }
    .doc-section figure.table > figcaption { font-size: 10px; color: #64748b; margin-bottom: 4px; caption-side: top; }
  </style></head><body>
  <div class="cover">
    <div class="accent-bar"></div>
    <div class="logos">
      ${custLogo ? `<img src="${custLogo}" alt="customer logo">` : ""}
      ${brandLogo ? `<img src="${brandLogo}" alt="logo">` : ""}
    </div>
    <div class="eyebrow">Technical Proposal</div>
    <h1>${esc(input.proposal.title)}</h1>
    <div class="meta">
      <div><strong>Prepared for:</strong> ${esc(input.customer.name)}</div>
      ${
        input.proposal.contactName
          ? `<div><strong>Attn:</strong> ${esc(input.proposal.contactName)}${
              input.proposal.contactTitle ? `, ${esc(input.proposal.contactTitle)}` : ""
            }</div>`
          : ""
      }
      ${input.proposal.reference ? `<div><strong>Reference:</strong> ${esc(input.proposal.reference)}</div>` : ""}
      <div><strong>Date:</strong> ${dateStr}</div>
    </div>
  </div>
  <div class="content">
    ${sectionHtml}
    ${boqSection}
  </div>
  </body></html>`;

  return { html, missingTokens: [...missing] };
}
