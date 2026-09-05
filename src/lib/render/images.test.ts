import { describe, it, expect } from "vitest";
import { decodeDataUri, sanitizeContentImages } from "./images";

// 1x1 transparent PNG
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("decodeDataUri", () => {
  it("decodes a clean base64 PNG", () => {
    const d = decodeDataUri(`data:image/png;base64,${PNG_B64}`);
    expect(d?.mime).toBe("image/png");
    expect(d?.buf.length).toBeGreaterThan(20);
  });

  it("tolerates whitespace/newlines in the payload", () => {
    const withBreaks = `data:image/png;base64,${PNG_B64.slice(0, 40)}\n  ${PNG_B64.slice(40)}`;
    expect(decodeDataUri(withBreaks)?.mime).toBe("image/png");
  });

  it("sniffs the type when the declared MIME is unusable", () => {
    const d = decodeDataUri(`data:image/vnd.microsoft.weird;base64,${PNG_B64}`);
    expect(d?.mime).toBe("image/png");
  });

  it("converts a percent-encoded SVG", () => {
    const d = decodeDataUri(
      "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E",
    );
    expect(d?.mime).toBe("image/svg+xml");
    expect(d?.buf.toString("utf8")).toContain("<svg");
  });

  it("rejects junk and blob URLs", () => {
    expect(decodeDataUri("data:image/png;base64,not really base64!!")).toBeNull();
    expect(decodeDataUri("blob:https://x/abc")).toBeNull();
    expect(decodeDataUri("")).toBeNull();
  });
});

describe("sanitizeContentImages", () => {
  it("re-encodes a data: image to a single clean line", () => {
    const html = `<p><img src="data:image/png;base64,${PNG_B64.slice(0, 30)}\n${PNG_B64.slice(30)}" alt="x"></p>`;
    const out = sanitizeContentImages(html);
    expect(out).toContain(`data:image/png;base64,${PNG_B64}`);
    expect(out).not.toContain("\n");
  });

  it("drops an undecodable data: image but keeps surrounding content", () => {
    const out = sanitizeContentImages(
      '<p>before</p><figure class="image"><img src="data:image/x-icon;base64,AAAA"></figure><p>after</p>',
    );
    expect(out).not.toContain("<img");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("drops blob: images and leaves /api/files and http images alone", () => {
    const out = sanitizeContentImages(
      '<img src="blob:https://x/1"><img src="/api/files/editor-images/a.png"><img src="https://ex.test/b.png">',
    );
    expect(out).not.toContain("blob:");
    expect(out).toContain('src="/api/files/editor-images/a.png"');
    expect(out).toContain('src="https://ex.test/b.png"');
  });

  it("is a no-op when there are no images", () => {
    expect(sanitizeContentImages("<p>hello</p>")).toBe("<p>hello</p>");
  });
});
