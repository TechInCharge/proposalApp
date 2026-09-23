/**
 * Reads direct (character-level) run formatting — font, size, color, bold,
 * italic, underline, strike — straight out of a paragraph's raw OOXML.
 *
 * Why this exists: `doc.getHtml()` (what compose-docx.ts uses to carry each
 * section's content into the composed master) only exports *structural*
 * formatting (headings, bold/italic as semantic tags, lists, tables) — it
 * drops direct formatting entirely. Confirmed on a real production section:
 * a heading run that's `Arial, bold, #4828C3, 18pt` in the source .docx
 * exports as bare `<h1><strong>...</strong></h1>`, and after
 * `master.insert({type:"html"})` only "bold" survives — same gap already
 * known for color specifically (see brand-docx.ts's doc comment), just
 * broader than previously confirmed (font family and size too, for every
 * run, not only headings).
 *
 * The SDK's own introspection (`blocks.list()`) is paragraph-level only —
 * one text string per block, no run boundaries — so there's no supported API
 * to read this back once the round trip has already happened. Reading the
 * source paragraph's own `<w:r>` elements directly (each one's own `<w:rPr>`
 * is the authoritative "what you actually see" formatting — direct
 * formatting always wins over style defaults in OOXML) is the only way to
 * recover it, in the same spirit as shade-table-cell.ts's raw-XML patch for
 * cell shading (another `@superdoc/sdk` gap).
 */

export interface RunFormat {
  text: string;
  fontFamily?: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

function decodeXmlText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Every run's own text + direct formatting for one paragraph, identified by
 * its `w14:paraId` (the same value `blocks.list()` reports as `nodeId` for
 * paragraph/heading/listItem blocks). Returns `[]` if the paragraph can't be
 * found or has no text-bearing runs — never throws, since a caller iterating
 * many paragraphs shouldn't have one miss (e.g. a run with only a footnote
 * reference) abort the whole pass.
 */
export function extractParagraphRuns(documentXml: string, paraId: string): RunFormat[] {
  const paraMatch = documentXml.match(
    new RegExp(`<w:p\\b[^>]*\\bw14:paraId="${paraId}"[^>]*>([\\s\\S]*?)</w:p>`),
  );
  if (!paraMatch) return [];
  const paraInner = paraMatch[1];

  const runs: RunFormat[] = [];
  const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  for (const runMatch of paraInner.matchAll(runRe)) {
    const runInner = runMatch[1];
    const textMatch = runInner.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/);
    if (!textMatch || !textMatch[1]) continue;
    const text = decodeXmlText(textMatch[1]);
    if (!text.trim()) continue;

    const rPrMatch = runInner.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[1] : "";

    const format: RunFormat = { text };
    const fontMatch = rPr.match(/<w:rFonts\b[^>]*\bw:ascii="([^"]*)"/);
    if (fontMatch) format.fontFamily = fontMatch[1];
    const colorMatch = rPr.match(/<w:color\b[^>]*\bw:val="([^"]*)"/);
    if (colorMatch && colorMatch[1] !== "auto") format.color = colorMatch[1];
    const szMatch = rPr.match(/<w:sz\b[^>]*\bw:val="(\d+)"/);
    if (szMatch) format.fontSize = Number(szMatch[1]) / 2;
    if (/<w:b\s*\/>|<w:b\b[^>]*\/>|<w:b>/.test(rPr)) format.bold = true;
    if (/<w:i\s*\/>|<w:i\b[^>]*\/>|<w:i>/.test(rPr)) format.italic = true;
    const underlineMatch = rPr.match(/<w:u\b[^>]*\bw:val="([^"]*)"/);
    if (underlineMatch && underlineMatch[1] !== "none") format.underline = true;
    if (/<w:strike\s*\/>|<w:strike\b[^>]*\/>|<w:strike>/.test(rPr)) format.strike = true;

    runs.push(format);
  }
  return runs;
}

/** Whether a run carries any direct formatting worth restoring. */
export function hasDirectFormatting(run: RunFormat): boolean {
  return (
    run.fontFamily !== undefined ||
    run.color !== undefined ||
    run.fontSize !== undefined ||
    run.bold === true ||
    run.italic === true ||
    run.underline === true ||
    run.strike === true
  );
}
