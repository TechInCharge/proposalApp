import { describe, it, expect } from "vitest";
import { assembleProposalDocxHtml } from "./assemble-docx";
import { DEFAULT_BRAND, type AssembleInput } from "./assemble";

function baseInput(overrides: Partial<AssembleInput> = {}): AssembleInput {
  return {
    proposal: {
      title: "Firewall Refresh",
      proposalDate: new Date("2026-09-06T12:00:00Z"),
      reference: "OPP-1",
      contactName: "Jane Doe",
      contactTitle: "IT Director",
      contactEmail: null,
      contactPhone: null,
    },
    customer: { name: "Acme Co.", website: null, logoUrl: null },
    brand: DEFAULT_BRAND,
    sections: [{ id: "s1", title: "Overview", body: "<p>For {{customer.name}}.</p>" }],
    boqItems: [],
    ...overrides,
  };
}

describe("assembleProposalDocxHtml", () => {
  it("inlines brand colours and a page break on the cover, resolves tokens", async () => {
    const { html, missingTokens } = await assembleProposalDocxHtml(baseInput());
    expect(html).not.toContain("<style"); // no stylesheet reliance
    expect(html).toContain("page-break-after:always");
    expect(html).toContain(`color:${DEFAULT_BRAND.secondaryColor}`); // H1
    expect(html).toContain("<strong>Attn:</strong> Jane Doe, IT Director");
    expect(html).toContain("For Acme Co.");
    expect(missingTokens).toEqual([]);
  });

  it("styles the section heading inline", async () => {
    const { html } = await assembleProposalDocxHtml(baseInput());
    expect(html).toMatch(
      new RegExp(
        `<h2 style="[^"]*color:${DEFAULT_BRAND.secondaryColor}[^"]*border-bottom:2px solid ${DEFAULT_BRAND.primaryColor}`,
      ),
    );
  });

  it("unwraps CKEditor <figure> and gives tables real borders", async () => {
    const body =
      '<figure class="table"><table><thead><tr><th>Metric</th></tr></thead>' +
      "<tbody><tr><td>for {{customer.name}}</td></tr></tbody></table></figure>" +
      '<figure class="image image-style-align-right"><img src="https://x.test/a.png" alt="a"><figcaption>Fig 1</figcaption></figure>';
    const { html } = await assembleProposalDocxHtml(
      baseInput({ sections: [{ id: "s1", title: "S", body }] }),
    );
    expect(html).not.toContain("<figure");
    expect(html).not.toContain("<figcaption");
    expect(html).toMatch(/<table border="1"[^>]*border-collapse:collapse/);
    expect(html).toContain("border:1px solid #cbd5e1");
    expect(html).toContain("for Acme Co.");
    expect(html).toContain('<p style="text-align:right;margin:6pt 0"><img');
    expect(html).toContain("Fig 1");
  });

  it("injects a brand-coloured BoQ table for {{boq.table}}", async () => {
    const { html } = await assembleProposalDocxHtml(
      baseInput({
        sections: [{ id: "s1", title: "Items", body: "<p>{{boq.table}}</p>" }],
        boqItems: [{ partNumber: "FW-1", description: "Firewall", quantity: 2 }],
      }),
    );
    expect(html).not.toContain("{{boq.table}}");
    expect(html).toContain(`background-color:${DEFAULT_BRAND.primaryColor};color:#ffffff`);
    expect(html).toContain("FW-1");
    expect(html.match(/Bill of Quantities/g)).toBeNull(); // not also appended
  });

  it("appends a BoQ section when items exist but no token is used", async () => {
    const { html } = await assembleProposalDocxHtml(
      baseInput({ boqItems: [{ partNumber: "A", description: "Thing", quantity: 1 }] }),
    );
    expect(html).toContain("Bill of Quantities");
    expect(html).toContain("Thing");
  });
});
