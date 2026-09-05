import { describe, it, expect } from "vitest";
import { sanitizeSectionHtml } from "./sanitize";

describe("sanitizeSectionHtml", () => {
  it("keeps the tags CKEditor emits", () => {
    const html = sanitizeSectionHtml(
      '<h2>Title</h2><p><strong>b</strong> <i>i</i> <u>u</u> <s>s</s></p>' +
        '<ul><li>one</li></ul>' +
        '<figure class="image image-style-align-left"><img src="/api/files/editor-images/x.png" alt="x"></figure>' +
        '<figure class="table"><table><tbody><tr><td>c</td></tr></tbody></table></figure>',
    );
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<figure class=\"image image-style-align-left\">");
    expect(html).toContain('src="/api/files/editor-images/x.png"');
    expect(html).toContain("<table>");
  });

  it("strips scripts, event handlers and javascript: urls", () => {
    const html = sanitizeSectionHtml(
      '<p onmouseover="x()">t</p><script>x()</script>' +
        '<a href="javascript:alert(1)">l</a>',
    );
    expect(html).not.toContain("script");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("t");
  });

  it("keeps whitelisted inline styles and drops the rest", () => {
    const html = sanitizeSectionHtml(
      '<p style="text-align:center;color:#5636CE;position:fixed;">t</p>',
    );
    expect(html).toMatch(/text-align:\s*center/);
    expect(html).toMatch(/color:\s*#5636CE/i);
    expect(html).not.toContain("position");
  });

  it("drops unknown classes but keeps CKEditor ones", () => {
    const html = sanitizeSectionHtml(
      '<p class="ck-evil marker-yellow">t</p>',
    );
    expect(html).toContain("marker-yellow");
    expect(html).not.toContain("ck-evil");
  });

  it("returns an empty string for non-string / blank input", () => {
    expect(sanitizeSectionHtml(undefined)).toBe("");
    expect(sanitizeSectionHtml("   ")).toBe("");
    expect(sanitizeSectionHtml({ type: "doc" })).toBe("");
  });
});
