/**
 * Builds the default cover .docx (the "Load default layout" starting point
 * in the cover editor) and saves it via storage.ts at a fixed filename —
 * not a random UUID — so cover-constants.ts::DEFAULT_COVER_TEMPLATE_URL can
 * point at a stable path.
 *
 *   npx tsx scripts/build-default-cover.ts          # local (.env STORAGE_DIR)
 *   railway run npx tsx scripts/build-default-cover.ts   # against Railway's volume
 *
 * Re-run (and re-run against Railway) any time the default cover's design
 * should change — it overwrites the same path each time.
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ShadingType } from "docx";
import { saveFile } from "../src/lib/storage";

const PRIMARY = "5636CE";
const INK = "1F2024";
const SLATE = "475569";
const FONT = "Calibri";

async function main() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            shading: { type: ShadingType.SOLID, fill: PRIMARY, color: PRIMARY },
            children: [new TextRun({ text: " ", size: 4 })],
          }),
          new Paragraph({ children: [new TextRun({ text: "{{brand.logo}}", size: 20, font: FONT })] }),
          new Paragraph({ spacing: { before: 800 } }),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "TECHNICAL PROPOSAL", bold: true, size: 18, color: PRIMARY, font: FONT, characterSpacing: 30 })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
            children: [new TextRun({ text: "{{proposal.title}}", font: FONT })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Prepared for: ", bold: true, size: 22, color: INK, font: FONT }), new TextRun({ text: "{{customer.name}}", size: 22, color: SLATE, font: FONT })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Attn: ", bold: true, size: 22, color: INK, font: FONT }), new TextRun({ text: "{{contact.name}}, {{contact.title}}", size: 22, color: SLATE, font: FONT })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Reference: ", bold: true, size: 22, color: INK, font: FONT }), new TextRun({ text: "{{proposal.reference}}", size: 22, color: SLATE, font: FONT })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Date: ", bold: true, size: 22, color: INK, font: FONT }), new TextRun({ text: "{{proposal.date}}", size: 22, color: SLATE, font: FONT })],
          }),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const { url } = await saveFile(buf, { prefix: "defaults", ext: "docx", filename: "cover-template.docx" });
  console.log("Saved default cover to:", url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
