import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from "docx";
import { shadeCellsContaining } from "./shade-table-cell";

async function buildTableDocx(): Promise<Buffer> {
  const table = new Table({
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Metric")] }), new TableCell({ children: [new Paragraph("Value")] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Throughput")] }), new TableCell({ children: [new Paragraph("12 Gbps")] })] }),
    ],
  });
  const doc = new Document({ sections: [{ children: [table] }] });
  return Packer.toBuffer(doc);
}

async function documentXml(buf: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml missing");
  return file.async("string");
}

describe("shadeCellsContaining", () => {
  it("adds a <w:shd> fill to cells whose text matches an anchor, and only those cells", async () => {
    const docx = await buildTableDocx();
    const shaded = await shadeCellsContaining(docx, ["Metric"], "5636CE");

    const xml = await documentXml(shaded);
    expect((xml.match(/<w:shd /g) ?? []).length).toBe(1);
    expect(xml).toContain('<w:shd w:val="clear" w:color="auto" w:fill="5636CE"/>');
    // The shading landed in the "Metric" cell's <w:tcPr>, not "Value"'s.
    const shdIdx = xml.indexOf("<w:shd");
    const metricIdx = xml.indexOf(">Metric<");
    const valueIdx = xml.indexOf(">Value<");
    expect(shdIdx).toBeLessThan(metricIdx);
    expect(shdIdx).toBeLessThan(valueIdx);
  });

  it("shades multiple anchors across multiple cells", async () => {
    const docx = await buildTableDocx();
    const shaded = await shadeCellsContaining(docx, ["Metric", "Value"], "5636CE");
    const xml = await documentXml(shaded);
    expect((xml.match(/<w:shd /g) ?? []).length).toBe(2);
  });

  it("silently skips an anchor that isn't present, rather than throwing", async () => {
    const docx = await buildTableDocx();
    const shaded = await shadeCellsContaining(docx, ["Does Not Exist"], "5636CE");
    const xml = await documentXml(shaded);
    expect(xml).not.toContain("<w:shd");
  });

  it("returns a well-formed docx (round-trips through JSZip without error)", async () => {
    const docx = await buildTableDocx();
    const shaded = await shadeCellsContaining(docx, ["Metric"], "5636CE");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(shaded);
    expect(zip.file("word/document.xml")).not.toBeNull();
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
  });
});
