import { describe, it, expect, afterAll } from "vitest";
import { rm } from "node:fs/promises";
import { Document, Packer, Paragraph } from "docx";
import { sectionBodyToHtml } from "./section-html";
import { saveFile } from "@/lib/storage";

// Spawns a real headless LibreOffice process — much slower than the rest of
// the suite (seconds, not milliseconds).
const SLOW = 30_000;

const savedKeys: string[] = [];
afterAll(async () => {
  await Promise.all(savedKeys.map((key) => rm(`.storage/${key}`, { force: true })));
});

describe("sectionBodyToHtml", () => {
  it("returns sanitised HTML unchanged for a plain HTML-string body", async () => {
    expect(await sectionBodyToHtml("<p>Hello {{customer.name}}</p>")).toBe(
      "<p>Hello {{customer.name}}</p>",
    );
  });

  it("returns an empty string for null/undefined/unrecognised bodies", async () => {
    expect(await sectionBodyToHtml(null)).toBe("");
    expect(await sectionBodyToHtml(undefined)).toBe("");
    expect(await sectionBodyToHtml(42)).toBe("");
  });

  it(
    // The bridge this test exercises fixed a real bug: a section saved in the
    // new SuperDoc editor stores a docx URL as its body, and without this
    // branch that URL string sailed through sanitizeSectionHtml unchanged and
    // rendered literally in the generated PDF/DOCX instead of the author's
    // content (see the SuperDoc migration plan, Phase 2 -> Phase 4 gap).
    "bridges a section-bodies docx URL through LibreOffice to HTML",
    async () => {
      const doc = new Document({ sections: [{ children: [new Paragraph("Dear {{customer.name}}, docx bridge works.")] }] });
      const { key, url } = await saveFile(await Packer.toBuffer(doc), { prefix: "section-bodies", ext: "docx" });
      savedKeys.push(key);

      const html = await sectionBodyToHtml(url);

      expect(html).toContain("Dear {{customer.name}}, docx bridge works.");
      expect(html).not.toContain("/api/files/");
    },
    SLOW,
  );

  it(
    "renders a placeholder instead of throwing when the referenced docx file is missing",
    async () => {
      const html = await sectionBodyToHtml("/api/files/section-bodies/does-not-exist.docx");
      expect(html).toContain("could not be rendered");
    },
    SLOW,
  );
});
