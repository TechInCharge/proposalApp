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

  it("appends a Bill of Quantities section (no pricing) when items exist and no token is used", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        boqItems: [{ partNumber: "FW-1", description: "Firewall", quantity: 2 }],
      }),
    );
    expect(html).toContain("Bill of Quantities");
    expect(html).toContain("FW-1");
    expect(html).toContain("Firewall");
    expect(html).not.toContain("Unit Price");
    expect(html).not.toContain("Grand Total");
  });

  it("injects the BoQ table in place of a {{boq.table}} paragraph, not appended", async () => {
    const input = baseInput({
      sections: [{ id: "s1", title: "Items", body: doc("See below.", "{{boq.table}}") }],
      boqItems: [{ partNumber: "FW-1", description: "Firewall", quantity: 1 }],
    });
    const { html } = await assembleProposalHtml(input);
    expect(html).not.toContain("<p>{{boq.table}}</p>");
    // Only one BoQ table => only one "Bill of Quantities" header would appear
    // if it were also appended; confirm it was not.
    expect(html.match(/Bill of Quantities/g)).toBeNull();
    expect(html).toContain("FW-1");
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

  it("renders rich-text tables, images, alignment and colour from a section body", async () => {
    const richBody = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 3, textAlign: "center" },
          content: [{ type: "text", text: "Specs" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "textStyle", attrs: { color: "#5636CE" } }],
              text: "coloured",
            },
          ],
        },
        { type: "image", attrs: { src: "https://example.test/diagram.png", alt: "d" } },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Metric" }] }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Value" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Throughput" }] }],
                },
                {
                  type: "tableCell",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "for {{customer.name}}" }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const { html, missingTokens } = await assembleProposalHtml(
      baseInput({ sections: [{ id: "s1", title: "Details", body: richBody }] }),
    );
    expect(html).toContain("text-align: center");
    expect(html).toContain("color: #5636CE");
    expect(html).toContain('<img class="doc-image"');
    expect(html).toContain("https://example.test/diagram.png"); // external src untouched
    expect(html).toMatch(/<table[^>]*class="doc-table"/);
    expect(html).toContain("<th");
    expect(html).toContain("Throughput");
    expect(html).toContain("for Acme Co."); // token inside a table cell resolved
    expect(missingTokens).toEqual([]);
  });
});
