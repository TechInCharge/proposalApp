import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { docxToPdf } from "./docx-to-pdf";

// Spawns a real headless LibreOffice process — much slower than the rest of
// the suite (seconds, not milliseconds).
const SLOW = 30_000;

describe("docxToPdf", () => {
  it(
    "converts a simple .docx to a valid PDF",
    async () => {
      const doc = new Document({
        sections: [{ children: [new Paragraph({ text: "Proposal", heading: HeadingLevel.HEADING_1 }), new Paragraph("Prepared for Acme Corp.")] }],
      });
      const docxBuffer = await Packer.toBuffer(doc);

      const pdf = await docxToPdf(docxBuffer);

      expect(pdf.length).toBeGreaterThan(0);
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    },
    SLOW,
  );
});
