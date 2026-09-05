import { describe, it, expect } from "vitest";
import {
  coverTemplateString,
  pickCoverTemplate,
  resolveCoverHtml,
  type CoverData,
} from "./cover";

const data: CoverData = {
  title: "Firewall Refresh",
  proposalDate: new Date("2026-09-06T12:00:00Z"),
  reference: "OPP-9",
  contactName: "Jane Doe",
  contactTitle: "IT Director",
  contactEmail: null,
  contactPhone: null,
  customerName: "Acme Co.",
  customerWebsite: "acme.test",
  brandLogoDataUri: "data:image/png;base64,AAAA",
  customerLogoDataUri: null,
};

describe("coverTemplateString", () => {
  it("returns null for blank / empty-editor content", () => {
    expect(coverTemplateString(null)).toBeNull();
    expect(coverTemplateString("")).toBeNull();
    expect(coverTemplateString("   ")).toBeNull();
    expect(coverTemplateString("<p>&nbsp;</p>")).toBeNull();
    expect(coverTemplateString("<p></p><p><br></p>")).toBeNull();
  });
  it("returns the trimmed html when there is real content", () => {
    expect(coverTemplateString("  <h1>Hi</h1> ")).toBe("<h1>Hi</h1>");
  });
});

describe("pickCoverTemplate", () => {
  it("prefers the proposal override, then the brand, then null", () => {
    expect(pickCoverTemplate("<p>P</p>", "<p>B</p>")).toBe("<p>P</p>");
    expect(pickCoverTemplate("<p>&nbsp;</p>", "<p>B</p>")).toBe("<p>B</p>");
    expect(pickCoverTemplate(null, null)).toBeNull();
  });
});

describe("resolveCoverHtml", () => {
  it("resolves tokens and swaps logo tokens for <img>", () => {
    const { html, missing } = resolveCoverHtml(
      "<h1>{{proposal.title}}</h1><p>{{customer.name}} — {{proposal.date}}</p>" +
        "<p>{{brand.logo}}</p><p>{{customer.logo}}</p>",
      data,
    );
    expect(html).toContain("<h1>Firewall Refresh</h1>");
    expect(html).toContain("Acme Co. — 2026-09-06");
    expect(html).toContain('<img src="data:image/png;base64,AAAA"');
    expect(html).not.toContain("{{brand.logo}}");
    expect(html).not.toContain("{{customer.logo}}"); // no logo -> removed
    expect(missing).toEqual([]);
  });

  it("reports unknown tokens and strips scripts", () => {
    const { html, missing } = resolveCoverHtml(
      "<p>{{customer.vatId}}</p><script>x()</script>",
      data,
    );
    expect(html).toContain("{{customer.vatId}}");
    expect(html).not.toContain("<script");
    expect(missing).toEqual(["customer.vatId"]);
  });
});
