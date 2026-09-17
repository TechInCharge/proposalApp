import JSZip from "jszip";

/**
 * Injects `<w:shd fill="..."/>` into every table cell containing an exact
 * anchor string, by direct OOXML patch.
 *
 * A workaround, not a preferred pattern: `tables.setShading`,
 * `tables.setCellProperties({shading})`, and `tables.applyStyle()` in
 * `@superdoc/sdk@2.12.0` all report `{success:true}` while persisting
 * nothing — confirmed by inspecting `document.xml`/`styles.xml` directly
 * after each call, not just trusting the response (see the SuperDoc
 * migration plan for the full writeup). Retest those against future SDK
 * releases before assuming this file is still needed.
 *
 * Anchors not present in the document are skipped, not errors — callers may
 * pass a fixed label set that isn't always present (e.g. no BoQ table when
 * a proposal has no line items).
 */
export async function shadeCellsContaining(docx: Buffer, anchors: string[], fillHex: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docx);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml not found in .docx");
  let xml = await file.async("string");

  for (const anchor of anchors) {
    xml = shadeCellContaining(xml, anchor, fillHex);
  }

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}

function shadeCellContaining(xml: string, anchorText: string, fill: string): string {
  const textIdx = xml.indexOf(`>${escapeXmlText(anchorText)}<`);
  if (textIdx === -1) return xml;

  const tcOpenIdx = xml.lastIndexOf("<w:tc>", textIdx);
  if (tcOpenIdx === -1) return xml;

  const tcPrOpen = "<w:tcPr>";
  const tcPrIdx = xml.indexOf(tcPrOpen, tcOpenIdx);
  const tcCloseIdx = xml.indexOf("</w:tc>", tcOpenIdx);
  const shd = `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`;

  if (tcPrIdx === -1 || tcPrIdx > tcCloseIdx) {
    // No existing <w:tcPr> on this cell — add one.
    const insertAt = tcOpenIdx + "<w:tc>".length;
    return xml.slice(0, insertAt) + `<w:tcPr>${shd}</w:tcPr>` + xml.slice(insertAt);
  }
  const insertAt = tcPrIdx + tcPrOpen.length;
  return xml.slice(0, insertAt) + shd + xml.slice(insertAt);
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
