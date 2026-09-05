import { describe, it, expect } from "vitest";
import {
  resolvePlaceholders,
  resolvePlaceholdersInHtml,
  buildContext,
  extractTokens,
} from "./placeholders";

function para(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function doc(...paras: string[]) {
  return { type: "doc", content: paras.map(para) };
}

const ctx = buildContext({
  customerName: "Acme Co.",
  customerWebsite: "https://acme.test",
  proposalTitle: "Firewall Refresh",
  proposalDate: new Date("2026-09-04T12:00:00Z"),
  reference: "OPP-1",
});

describe("extractTokens", () => {
  it("pulls dotted tokens from a string", () => {
    expect(extractTokens("Hi {{customer.name}} re {{proposal.reference}}")).toEqual([
      "customer.name",
      "proposal.reference",
    ]);
  });
});

describe("resolvePlaceholders", () => {
  it("substitutes known tokens", () => {
    const { doc: out, missing } = resolvePlaceholders(
      doc("For {{customer.name}} on {{proposal.date}}"),
      ctx,
    );
    const text = (out as { content: { content: { text: string }[] }[] }).content[0]
      .content[0].text;
    expect(text).toBe("For Acme Co. on 2026-09-04");
    expect(missing).toEqual([]);
  });

  it("reports unknown tokens and leaves them intact", () => {
    const { doc: out, missing } = resolvePlaceholders(doc("{{customer.vatId}}"), ctx);
    const text = (out as { content: { content: { text: string }[] }[] }).content[0]
      .content[0].text;
    expect(text).toBe("{{customer.vatId}}");
    expect(missing).toEqual(["customer.vatId"]);
  });

  it("flags a paragraph that is exactly one token as a block token", () => {
    const { blockTokens } = resolvePlaceholders(
      doc("Intro", "{{boq.table}}", "Outro"),
      ctx,
    );
    expect(blockTokens).toHaveLength(1);
    expect(blockTokens[0].token).toBe("boq.table");
  });

  it("does not mutate the input document", () => {
    const input = doc("{{customer.name}}");
    const snapshot = JSON.stringify(input);
    resolvePlaceholders(input, ctx);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("handles empty / malformed input without throwing", () => {
    expect(() => resolvePlaceholders(null, ctx)).not.toThrow();
    expect(() => resolvePlaceholders({}, ctx)).not.toThrow();
  });
});

describe("resolvePlaceholdersInHtml", () => {
  it("substitutes known tokens and HTML-escapes the value", () => {
    const { html, missing } = resolvePlaceholdersInHtml(
      "<p>For {{customer.name}} on {{proposal.date}}</p>",
      buildContext({
        customerName: "A & B <Co>",
        proposalTitle: "T",
        proposalDate: new Date("2026-09-04T12:00:00Z"),
      }),
    );
    expect(html).toBe("<p>For A &amp; B &lt;Co&gt; on 2026-09-04</p>");
    expect(missing).toEqual([]);
  });

  it("leaves unknown and block tokens intact and reports the unknown ones", () => {
    const { html, missing } = resolvePlaceholdersInHtml(
      "<p>{{boq.table}}</p><p>{{customer.vatId}}</p>",
      ctx,
    );
    expect(html).toContain("<p>{{boq.table}}</p>");
    expect(html).toContain("{{customer.vatId}}");
    expect(missing).toEqual(["boq.table", "customer.vatId"]);
  });
});
