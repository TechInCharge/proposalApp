import { SuperDocClient } from "@superdoc/sdk";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOQ_TABLE_HEADER } from "@/lib/render/compose-docx";
import { shadeCellsContaining } from "@/lib/render/shade-table-cell";

export interface DocxBrand {
  /** Hex color without '#', e.g. "5636CE" (matches BrandProfile.primaryColor stripped of '#'). */
  primaryColor: string;
}

/**
 * Colors heading text and (if present) the Bill of Quantities table's header
 * row on an already-composed proposal .docx. Deliberately separate from
 * compose-docx.ts's structural composition — composeProposalDocx() stays a
 * pure "assemble the right content in the right order" function; this is an
 * independent, optional cosmetic pass callers can skip.
 *
 * Why a separate pass at all, rather than coloring at authoring time:
 * getHtml() (what compose-docx.ts uses to carry section content into the
 * master) never exports background-color or <w:color> for any run or table
 * cell — confirmed empirically. So color has to be (re)applied here, on the
 * composed master, via doc.format.apply(), which does genuinely persist
 * (confirmed via the raw OOXML) even though getHtml() still won't echo it
 * back out if you go check via HTML afterward.
 *
 * Headings are found *structurally* (blocks.list().nodeType === "heading"),
 * not by any hardcoded text — this has to work for arbitrary, unknown
 * section content. format.apply() itself only accepts refs from a *text*
 * query.match (a node-search ref is rejected as "unrecognized ref shape"),
 * so each heading's own text is used to re-match it before formatting.
 */
export async function applyBrandColors(docx: Buffer, brand: DocxBrand): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "brand-docx-"));
  const client = new SuperDocClient();
  try {
    await client.connect();
    const inPath = join(dir, "in.docx");
    await writeFile(inPath, docx);
    const doc = await client.open({ doc: inPath });

    const blocks = await doc.blocks.list({ includeText: true });
    const headingTexts = new Set<string>();
    for (const b of blocks.blocks) {
      if (b.nodeType === "heading" && b.text) headingTexts.add(b.text);
    }
    for (const text of headingTexts) {
      await colorText(doc, text, brand.primaryColor, true);
    }

    // BoQ header cell text: white, so it reads once shadeCellsContaining
    // fills the cell background below (a no-op if there's no BoQ table).
    for (const text of BOQ_TABLE_HEADER) {
      await colorText(doc, text, "FFFFFF", true);
    }

    const outPath = join(dir, "out.docx");
    await doc.save({ out: outPath });
    await doc.close();

    const branded = await readFile(outPath);
    return await shadeCellsContaining(branded, BOQ_TABLE_HEADER, brand.primaryColor);
  } finally {
    await client.dispose().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
}

async function colorText(
  doc: Awaited<ReturnType<SuperDocClient["open"]>>,
  text: string,
  color: string,
  bold: boolean,
): Promise<void> {
  const match = await doc.query.match({ select: { type: "text", pattern: text, mode: "contains" }, require: "any" });
  for (const item of match.items) {
    await doc.format.apply({ ref: item.handle.ref, inline: { color, bold } });
  }
}
