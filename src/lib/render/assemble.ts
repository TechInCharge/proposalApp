import { buildContext, resolvePlaceholders } from "@/lib/placeholders";
import { docToHtml } from "@/lib/render/tiptap";
import { toDataUri } from "@/lib/storage";

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

export const DEFAULT_BRAND: AssembleInput["brand"] = {
  logoUrl: null,
  primaryColor: "#1D4ED8",
  secondaryColor: "#0F172A",
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

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    :root { --primary: ${esc(input.brand.primaryColor)}; --secondary: ${esc(
      input.brand.secondaryColor,
    )}; }
    * { box-sizing: border-box; }
    body { font-family: ${esc(
      input.brand.fontFamily,
    )}, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; line-height: 1.6; }
    .cover { min-height: 96vh; display: flex; flex-direction: column; justify-content: center;
      padding: 48px; border-top: 10px solid var(--primary); page-break-after: always; }
    .cover .logos { display: flex; gap: 32px; align-items: center; margin-bottom: 48px; }
    .cover img { max-height: 64px; }
    .cover h1 { font-size: 30px; color: var(--secondary); margin: 0 0 8px; }
    .cover .meta { color: #475569; margin-top: 24px; }
    .content { padding: 32px 48px; }
    .doc-section { page-break-inside: avoid; margin-bottom: 20px; }
    .doc-section h2 { color: var(--primary); font-size: 16px; border-bottom: 2px solid var(--primary);
      padding-bottom: 4px; }
    h1,h2,h3 { color: var(--secondary); }
    table.boq { border-collapse: collapse; width: 100%; font-size: 11px; }
    table.boq th { background: var(--primary); color: #fff; text-align: left; padding: 6px 8px; }
    table.boq td { border: 1px solid #cbd5e1; padding: 6px 8px; }
    p { margin: 6px 0; }
    ul, ol { margin: 6px 0 6px 20px; }
  </style></head><body>
  <div class="cover">
    <div class="logos">
      ${custLogo ? `<img src="${custLogo}" alt="customer logo">` : ""}
      ${brandLogo ? `<img src="${brandLogo}" alt="logo">` : ""}
    </div>
    <h1>${esc(input.proposal.title)}</h1>
    <div style="color:var(--primary);font-weight:700;letter-spacing:2px;text-transform:uppercase">
      Technical Proposal
    </div>
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
