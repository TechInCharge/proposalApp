import { buildContext, resolvePlaceholders } from "@/lib/placeholders";
import { docToHtml } from "@/lib/render/tiptap";
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  const sectionHtml = input.sections
    .map((s) => {
      const { doc, missing: m } = resolvePlaceholders(s.body, ctx);
      m.forEach((t) => missing.add(t));
      let body = docToHtml(doc);
      body = body.replace(/<p>\s*\{\{\s*boq\.table\s*\}\}\s*<\/p>/gi, () => {
        boqRendered = true;
        return boqHtml;
      });
      return `<section class="doc-section"><h2>${esc(s.title)}</h2>${body}</section>`;
    })
    .join("\n");

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
