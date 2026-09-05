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

  it("keeps a resized image's display width and drops its natural-size attributes", async () => {
    const body =
      '<figure class="image image_resized" style="width:41.5%;">' +
      '<img src="/api/files/editor-images/a.png" width="1600" height="1000"></figure>' +
      '<p>x <img class="image-inline" style="width:120px;aspect-ratio:16/10;" ' +
      'src="/api/files/editor-images/b.png" width="800" height="500"> y</p>';
    const { html } = await assembleProposalDocxHtml(
      baseInput({ sections: [{ id: "s1", title: "S", body }] }),
    );
    // no natural-size width/height attributes survive
    expect(html).not.toMatch(/<img[^>]*\bwidth="\d/);
    expect(html).not.toMatch(/<img[^>]*\bheight="\d/);
    expect(html).not.toContain("aspect-ratio");
    // display widths carried onto the <img>, capped
    expect(html).toContain("width:41.5%;max-width:100%");
    expect(html).toContain("width:120px;max-width:100%");
  });

  it("clamps a non-resized image to the page width", async () => {
    const { html } = await assembleProposalDocxHtml(
      baseInput({
        sections: [
          {
            id: "s1",
            title: "S",
            body: '<figure class="image"><img src="/api/files/editor-images/c.png" width="3000"></figure>',
          },
        ],
      }),
    );
    expect(html).toMatch(/<img[^>]*style="max-width:100%"/);
    expect(html).not.toMatch(/<img[^>]*\bwidth="3000"/);
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

  it("renders a custom cover template with inline styling and a page break", async () => {
    const { html } = await assembleProposalDocxHtml(
      baseInput({
        brand: {
          ...baseInput().brand,
          coverTemplate: "<h1>{{proposal.title}}</h1><p>For {{customer.name}}</p>",
        },
      }),
    );
    expect(html).toMatch(/<h1 style="[^"]*color:/); // heading got inline colour
    expect(html).toContain("Firewall Refresh");
    expect(html).toContain("For Acme Co.");
    expect(html).toContain("page-break-after:always");
    expect(html).not.toContain("Technical Proposal"); // auto eyebrow gone
  });

  it("appends a BoQ section when items exist but no token is used", async () => {
    const { html } = await assembleProposalDocxHtml(
      baseInput({ boqItems: [{ partNumber: "A", description: "Thing", quantity: 1 }] }),
    );
    expect(html).toContain("Bill of Quantities");
    expect(html).toContain("Thing");
  });
});
