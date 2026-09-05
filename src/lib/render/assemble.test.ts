import { describe, it, expect } from "vitest";
import { assembleProposalHtml, DEFAULT_BRAND, type AssembleInput } from "./assemble";

function para(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function doc(...paras: string[]) {
  return { type: "doc", content: paras.map(para) };
}

function baseInput(overrides: Partial<AssembleInput> = {}): AssembleInput {
  return {
    proposal: {
      title: "Firewall Refresh",
      proposalDate: new Date("2026-09-04T12:00:00Z"),
      reference: "OPP-1",
      showPricing: true,
      currency: "USD",
      contactName: null,
      contactTitle: null,
      contactEmail: null,
      contactPhone: null,
    },
    customer: { name: "Acme Co.", website: null, logoUrl: null },
    brand: DEFAULT_BRAND,
    sections: [{ id: "s1", title: "Overview", body: doc("Proposed for {{customer.name}}.") }],
    boqItems: [],
    ...overrides,
  };
}

describe("assembleProposalHtml", () => {
  it("renders the cover page and resolves placeholders in sections", async () => {
    const { html, missingTokens } = await assembleProposalHtml(baseInput());
    expect(html).toContain("Firewall Refresh");
    expect(html).toContain("Prepared for:</strong> Acme Co.");
    expect(html).toContain("Proposed for Acme Co.");
    expect(missingTokens).toEqual([]);
  });

  it("appends a Bill of Quantities section when items exist and no token is used", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        boqItems: [
          { partNumber: "FW-1", description: "Firewall", quantity: 2, unit: "ea", unitPrice: 1000 },
        ],
      }),
    );
    expect(html).toContain("Bill of Quantities");
    expect(html).toContain("$2,000.00"); // line + grand total
    expect(html).toContain("Grand Total");
  });

  it("injects the BoQ table in place of a {{boq.table}} paragraph, not appended", async () => {
    const input = baseInput({
      sections: [{ id: "s1", title: "Pricing", body: doc("See below.", "{{boq.table}}") }],
      boqItems: [
        { partNumber: "FW-1", description: "Firewall", quantity: 1, unit: "ea", unitPrice: 500 },
      ],
    });
    const { html } = await assembleProposalHtml(input);
    expect(html).not.toContain("<p>{{boq.table}}</p>");
    // Only one BoQ table => "Grand Total" appears exactly once.
    expect(html.match(/Grand Total/g)).toHaveLength(1);
  });

  it("omits price columns when showPricing is false", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        proposal: { ...baseInput().proposal, showPricing: false },
        boqItems: [
          { partNumber: "FW-1", description: "Firewall", quantity: 1, unit: "ea", unitPrice: 500 },
        ],
      }),
    );
    expect(html).toContain("Bill of Quantities");
    expect(html).not.toContain("Unit Price");
    expect(html).not.toContain("$500.00");
  });

  it("reports missing tokens", async () => {
    const { missingTokens } = await assembleProposalHtml(
      baseInput({ sections: [{ id: "s1", title: "X", body: doc("{{customer.vatId}}") }] }),
    );
    expect(missingTokens).toContain("customer.vatId");
  });

  it("shows an Attn: line on the cover when a contact is set, and resolves {{contact.*}}", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        proposal: {
          ...baseInput().proposal,
          contactName: "Jane Doe",
          contactTitle: "IT Director",
        },
        sections: [{ id: "s1", title: "X", body: doc("Contact: {{contact.name}}") }],
      }),
    );
    expect(html).toContain("Attn:</strong> Jane Doe, IT Director");
    expect(html).toContain("Contact: Jane Doe");
  });

  it("omits the Attn: line when no contact is set", async () => {
    const { html } = await assembleProposalHtml(baseInput());
    expect(html).not.toContain("Attn:");
  });
});
