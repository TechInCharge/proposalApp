import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph, HeadingLevel, ImageRun, Table, TableRow, TableCell, TextRun, WidthType } from "docx";
import { composeProposalDocx, type BoqRow } from "./compose-docx";
import { SuperDocClient } from "@superdoc/sdk";

// These exercise a real @superdoc/sdk subprocess per case — much slower than
// the rest of the suite (seconds, not milliseconds), so each gets a longer
// timeout rather than raising the global default for every other test.
const SLOW = 30_000;

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJnADFmH76aAAAAAElFTkSuQmCC",
  "base64",
);

async function docxOf(paragraphs: (Paragraph | Table)[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

/** Reads back the composed document's text and image count for assertions. */
async function inspect(buf: Buffer) {
  const client = new SuperDocClient();
  await client.connect();
  try {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "compose-docx-test-"));
    const path = join(dir, "out.docx");
    await writeFile(path, buf);
    const doc = await client.open({ doc: path });
    const text = await doc.getText();
    const images = await doc.images.list();
    await doc.close({ discard: true }).catch(() => {});
    return { text, imageCount: images.total };
  } finally {
    await client.dispose().catch(() => {});
  }
}

describe("composeProposalDocx", () => {
  it(
    "resolves placeholders and inserts a BoQ table across a cover and two sections",
    async () => {
      const cover = await docxOf([new Paragraph({ text: "Cover Page", heading: HeadingLevel.HEADING_1 }), new Paragraph("Prepared for {{customer.name}}.")]);
      const section1 = await docxOf([
        new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [new TextRun("Dear "), new TextRun({ text: "{{customer.name}}", bold: true }), new TextRun(", thank you for considering {{proposal.title}}.")],
        }),
      ]);
      // "Terms" after the marker checks ordering, not just presence — a past
      // bug had create.table silently append at the end of the whole
      // document instead of where the marker was, which content-presence
      // checks alone wouldn't have caught.
      const section2 = await docxOf([new Paragraph({ text: "Pricing" }), new Paragraph("{{boq.table}}"), new Paragraph("Terms and conditions apply.")]);

      const boqRows: BoqRow[] = [
        { partNumber: "FW-1000", description: "Next-Gen Firewall", quantity: 2 },
        { partNumber: null, description: "Onboarding", quantity: 1 },
      ];

      const composed = await composeProposalDocx({
        cover,
        sections: [section1, section2],
        boqRows,
        context: { "customer.name": "Acme Corp", "proposal.title": "Widget Deployment Proposal" },
      });

      expect(composed.missingTokens).toEqual([]);
      const { text } = await inspect(composed.buffer);
      expect(text).not.toContain("{{");
      expect(text).toContain("Prepared for Acme Corp.");
      expect(text).toContain("Dear Acme Corp, thank you for considering Widget Deployment Proposal.");
      expect(text).toContain("Part Number");
      expect(text).toContain("FW-1000");
      expect(text).toContain("Next-Gen Firewall");
      expect(text).toContain("Onboarding");
      expect(text.indexOf("Onboarding")).toBeLessThan(text.indexOf("Terms and conditions apply."));
    },
    SLOW,
  );

  it(
    "removes the {{boq.table}} marker without inserting a table when there are no rows",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([new Paragraph("{{boq.table}}"), new Paragraph("After")]);

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows: [], context: {} });
      const { text } = await inspect(composed.buffer);

      expect(text).not.toContain("boq.table");
      expect(text).toContain("CoverAfter");
    },
    SLOW,
  );

  it(
    "carries images from multiple sections through composition",
    async () => {
      // Text after each image checks ordering, not just presence — a past
      // bug had create.image silently append at the end of the whole
      // document instead of inline where the marker was.
      const cover = await docxOf([new Paragraph("Cover")]);
      const section1 = await docxOf([
        new Paragraph("Diagram A:"),
        new Paragraph({ children: [new ImageRun({ data: TINY_PNG, transformation: { width: 40, height: 40 }, type: "png" })] }),
        new Paragraph("Caption A follows the image."),
      ]);
      const section2 = await docxOf([
        new Paragraph("Diagram B:"),
        new Paragraph({ children: [new ImageRun({ data: TINY_PNG, transformation: { width: 40, height: 40 }, type: "png" })] }),
        new Paragraph("Caption B follows the image."),
      ]);

      const composed = await composeProposalDocx({ cover, sections: [section1, section2], boqRows: [], context: {} });
      const { text, imageCount } = await inspect(composed.buffer);

      expect(text).not.toContain("[image]");
      expect(imageCount).toBe(2);
      expect(text.indexOf("Diagram A:")).toBeLessThan(text.indexOf("Caption A follows the image."));
      expect(text.indexOf("Caption A follows the image.")).toBeLessThan(text.indexOf("Diagram B:"));
      expect(text.indexOf("Diagram B:")).toBeLessThan(text.indexOf("Caption B follows the image."));
    },
    SLOW,
  );

  it(
    "carries a merged-cell table through composition",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [new TableCell({ columnSpan: 2, children: [new Paragraph("Spanning header")] })] }),
            new TableRow({
              children: [new TableCell({ children: [new Paragraph("Left")] }), new TableCell({ children: [new Paragraph("Right")] })],
            }),
          ],
        }),
      ]);

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows: [], context: {} });
      const { text } = await inspect(composed.buffer);

      expect(text).toContain("Spanning header");
      expect(text).toContain("Left");
      expect(text).toContain("Right");
    },
    SLOW,
  );

  it(
    // Structurally mirrors a real seed SectionTemplate ("Solution Overview":
    // heading with a token, bold text, a bulleted list, a header-row table).
    // NOTE: built with the `docx` package, not the app's actual
    // @turbodocx/html-to-docx converter — that converter's output could not
    // be opened by @superdoc/sdk at all ("Failed to open document in the v2
    // runtime"), confirmed independently of this test. That's a real Phase 3
    // migration-script blocker, tracked in the plan file, not something to
    // paper over here.
    "composes real-shaped section content (heading, list, table)",
    async () => {
      const section = await docxOf([
        new Paragraph({ text: "Solution for {{customer.name}}", heading: HeadingLevel.HEADING_3 }),
        new Paragraph({
          children: [new TextRun("The proposed NGFW-1000 provides "), new TextRun({ text: "deep packet inspection", bold: true }), new TextRun(".")],
        }),
        new Paragraph({ text: "High-availability, sub-second failover", bullet: { level: 0 } }),
        new Paragraph({ text: "Central logging to the SIEM", bullet: { level: 0 } }),
        new Table({
          rows: [
            new TableRow({ children: [new TableCell({ children: [new Paragraph("Metric")] }), new TableCell({ children: [new Paragraph("Value")] })] }),
            new TableRow({
              children: [new TableCell({ children: [new Paragraph("Throughput (threat inspection)")] }), new TableCell({ children: [new Paragraph("10 Gbps")] })],
            }),
          ],
        }),
      ]);

      const composed = await composeProposalDocx({ cover: await docxOf([new Paragraph("Cover")]), sections: [section], boqRows: [], context: { "customer.name": "Acme Corp" } });
      const { text } = await inspect(composed.buffer);

      expect(text).not.toContain("{{");
      expect(text).toContain("Solution for Acme Corp");
      expect(text).toContain("High-availability, sub-second failover");
      expect(text).toContain("Throughput (threat inspection)");
      expect(text).toContain("10 Gbps");
    },
    SLOW,
  );

  it(
    "auto-appends a Bill of Quantities section when no section has a {{boq.table}} marker",
    async () => {
      const cover = await docxOf([new Paragraph("Cover")]);
      const section = await docxOf([new Paragraph("Scope of work, no BoQ marker here.")]);
      const boqRows: BoqRow[] = [{ partNumber: "FW-1000", description: "Next-Gen Firewall", quantity: 2 }];

      const composed = await composeProposalDocx({ cover, sections: [section], boqRows, context: {} });
      const { text } = await inspect(composed.buffer);

      expect(text).toContain("Bill of Quantities");
      expect(text).toContain("Part Number");
      expect(text).toContain("FW-1000");
      expect(text).toContain("Next-Gen Firewall");
      expect(text.indexOf("Scope of work")).toBeLessThan(text.indexOf("Bill of Quantities"));
    },
    SLOW,
  );

  it(
    "fills image tokens with real images and reports unresolved tokens",
    async () => {
      const cover = await docxOf([new Paragraph("{{brand.logo}}"), new Paragraph("Welcome")]);
      const section = await docxOf([new Paragraph("{{customer.logo}} and {{customer.unknownToken}}")]);

      const composed = await composeProposalDocx({
        cover,
        sections: [section],
        boqRows: [],
        context: {},
        images: {
          "brand.logo": { buffer: TINY_PNG, width: 20, height: 20 },
          "customer.logo": { buffer: TINY_PNG, width: 20, height: 20 },
        },
      });

      expect(composed.missingTokens).toEqual(["customer.unknownToken"]);
      const { text, imageCount } = await inspect(composed.buffer);
      expect(text).not.toContain("{{brand.logo}}");
      expect(text).not.toContain("{{customer.logo}}");
      expect(text).toContain("{{customer.unknownToken}}");
      expect(imageCount).toBe(2);
    },
    SLOW,
  );
});
