import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { SuperDocClient } from "@superdoc/sdk";
import { composeProposalDocx, type BoqRow } from "./compose-docx";
import { applyBrandColors } from "./brand-docx";

// Spawns real headless SuperDoc/LibreOffice subprocesses — much slower than
// the rest of the suite (seconds, not milliseconds).
const SLOW = 30_000;

async function docxOf(children: (Paragraph)[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

/** Reads back a .docx's raw document.xml for direct assertions on persisted formatting. */
async function rawDocumentXml(buf: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml missing");
  return file.async("string");
}

describe("applyBrandColors", () => {
  it(
    "colors every heading (regardless of level or text) and leaves body text untouched",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("First Heading")] }),
        new Paragraph({ children: [new TextRun("Plain body text.")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Second Heading")] }),
      ]);

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows: [], context: {} });
      const branded = await applyBrandColors(composed.buffer, { primaryColor: "5636CE" });

      const xml = await rawDocumentXml(branded);
      const colorCount = (xml.match(/<w:color w:val="5636CE"/g) ?? []).length;
      expect(colorCount).toBe(2); // both headings, not the body paragraph
      expect(xml).toContain("First Heading");
      expect(xml).toContain("Second Heading");
    },
    SLOW,
  );

  it(
    "shades the BoQ table header row and colors its text white when a BoQ table exists",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([new Paragraph("{{boq.table}}")]);
      const boqRows: BoqRow[] = [{ partNumber: "FW-1", description: "Firewall", quantity: 1 }];

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows, context: {} });
      const branded = await applyBrandColors(composed.buffer, { primaryColor: "5636CE" });

      const xml = await rawDocumentXml(branded);
      expect(xml).toContain('<w:shd w:val="clear" w:color="auto" w:fill="5636CE"/>');
      // Header labels get white text so they read against the shaded background.
      expect((xml.match(/<w:color w:val="FFFFFF"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    },
    SLOW,
  );

  it(
    "is a safe no-op for BoQ shading when there is no BoQ table (skips missing anchors rather than erroring)",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Only Heading")] })]);

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows: [], context: {} });
      const branded = await applyBrandColors(composed.buffer, { primaryColor: "5636CE" });

      const xml = await rawDocumentXml(branded);
      expect(xml).not.toContain("<w:shd");
      expect(xml).toContain('<w:color w:val="5636CE"');
    },
    SLOW,
  );

  it(
    "produces a document @superdoc/sdk can still open cleanly after the raw OOXML patch",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Heading")] }),
        new Paragraph("{{boq.table}}"),
      ]);
      const boqRows: BoqRow[] = [{ partNumber: "FW-1", description: "Firewall", quantity: 1 }];

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows, context: {} });
      const branded = await applyBrandColors(composed.buffer, { primaryColor: "5636CE" });

      const { mkdtemp, writeFile } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const dir = await mkdtemp(join(tmpdir(), "brand-docx-test-"));
      const path = join(dir, "out.docx");
      await writeFile(path, branded);

      const client = new SuperDocClient();
      await client.connect();
      try {
        const doc = await client.open({ doc: path });
        const text = await doc.getText();
        expect(text).toContain("Heading");
        expect(text).toContain("FW-1");
        await doc.close({ discard: true }).catch(() => {});
      } finally {
        await client.dispose();
      }
    },
    SLOW,
  );
});
