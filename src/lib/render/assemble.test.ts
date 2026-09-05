import { describe, it, expect } from "vitest";
import { assembleProposalHtml, DEFAULT_BRAND, type AssembleInput } from "./assemble";

/** Section bodies are HTML strings (CKEditor format). */
function doc(...paragraphs: string[]) {
  return paragraphs.map((t) => `<p>${t}</p>`).join("");
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

  it("uses a custom cover template from the brand profile", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        brand: {
          ...baseInput().brand,
          coverTemplate: "<h1>{{proposal.title}}</h1><p>Client: {{customer.name}}</p>",
        },
      }),
    );
    expect(html).toContain('<div class="cover-body">');
    expect(html).toContain("<h1>Firewall Refresh</h1>");
    expect(html).toContain("Client: Acme Co.");
    expect(html).not.toContain('class="eyebrow"'); // auto cover markup gone
  });

  it("does not shrink custom-cover content images with the auto-cover logo cap", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        brand: {
          ...baseInput().brand,
          coverTemplate: '<p><img src="/api/files/editor-images/x.png"></p>',
        },
      }),
    );
    // the 56px cap must be scoped to the auto cover's logo row, not all cover imgs
    expect(html).not.toMatch(/\.cover img\s*\{/);
    expect(html).toMatch(/\.cover \.logos img\s*\{[^}]*max-height:\s*56px/);
    expect(html).toMatch(/\.cover-body img\s*\{[^}]*max-width:\s*100%/);
  });

  it("lets a per-proposal cover override the brand cover", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        proposal: { ...baseInput().proposal, coverTemplate: "<h1>PROPOSAL COVER</h1>" },
        brand: { ...baseInput().brand, coverTemplate: "<h1>BRAND COVER</h1>" },
      }),
    );
    expect(html).toContain("PROPOSAL COVER");
    expect(html).not.toContain("BRAND COVER");
  });

  it("keeps rich CKEditor markup (tables, images, alignment, colour) and resolves tokens inside cells", async () => {
    const richBody = [
      '<h3 style="text-align:center;">Specs</h3>',
      '<p><span style="color:#5636CE;">coloured</span></p>',
      '<figure class="image"><img src="https://example.test/diagram.png" alt="d"></figure>',
      "<figure class=\"table\"><table>",
      "<thead><tr><th>Metric</th><th>Value</th></tr></thead>",
      "<tbody><tr><td>Throughput</td><td>for {{customer.name}}</td></tr></tbody>",
      "</table></figure>",
    ].join("");
    const { html, missingTokens } = await assembleProposalHtml(
      baseInput({ sections: [{ id: "s1", title: "Details", body: richBody }] }),
    );
    expect(html).toMatch(/text-align:\s*center/);
    expect(html).toMatch(/color:\s*#5636CE/i);
    expect(html).toContain("https://example.test/diagram.png");
    expect(html).toMatch(/<figure class="image"/);
    expect(html).toContain("<th");
    expect(html).toContain("Throughput");
    expect(html).toContain("for Acme Co."); // token inside a table cell resolved
    expect(missingTokens).toEqual([]);
  });

  it("drops scripts and event handlers from a section body", async () => {
    const { html } = await assembleProposalHtml(
      baseInput({
        sections: [
          {
            id: "s1",
            title: "X",
            body: '<p onclick="evil()">hi</p><script>steal()</script>',
          },
        ],
      }),
    );
    expect(html).not.toContain("<script>steal");
    expect(html).not.toContain("onclick");
    expect(html).toContain("hi");
  });
});
