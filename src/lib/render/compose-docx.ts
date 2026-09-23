import { SuperDocClient, type SuperDocDocument } from "@superdoc/sdk";
import JSZip from "jszip";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Composes a cover + N section .docx documents + a Bill of Quantities table
 * into one final proposal .docx, resolving {{token}} placeholders along the
 * way. Built on `@superdoc/sdk` (Node, headless — no browser).
 *
 * Recipe (validated in scripts/spike-compose-docx.ts, see
 * /Users/djenane/.claude/plans/abundant-rolling-dawn.md for the full writeup):
 *  1. Placeholder fill: doc.query.match({mode:"contains"}) + doc.replace —
 *     robust to Word's run-splitting, no content-control authoring needed.
 *  2. Composition: doc.getHtml() on a filled section + doc.insert({type:"html"})
 *     into the master. Carries headings/paragraphs/formatting/tables.
 *  3. Images: getHtml() drops them to a `[image]` text marker — patched back
 *     in with doc.create.image({src: base64, ref}) at that marker, then the
 *     leftover marker text is deleted (create.image anchors, it doesn't
 *     consume the match).
 *  4. {{boq.table}}: doc.create.table({ref}) at the marker (same anchor-not-
 *     consume behavior as images — delete the leftover marker text after) +
 *     doc.tables.setCellText per cell.
 */

const BOQ_TOKEN = "{{boq.table}}";

/**
 * `create.image`'s `src` data URI needs a MIME type that actually matches the
 * bytes — confirmed live against a real production document (all-JPEG logo/
 * section images) that mislabeling them as `image/png` makes the Document
 * Server host fail with "Image dimensions could not be determined" (it uses
 * the declared type to pick a decoder, so a real JPEG "labeled" PNG fails to
 * decode at all). The original code always wrote `image/png` regardless of
 * the actual bytes — fine for the synthetic all-PNG fixtures this was tested
 * against, wrong for anything else. Sniffed from the file's own magic bytes
 * rather than trusted from the docx package's declared content-type, since
 * that's what the SDK itself will end up decoding.
 */
function sniffImageMime(buf: Buffer): string {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 6 && buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

/** Exported so brand-docx.ts can target these exact cells without re-deriving them. */
export const BOQ_TABLE_HEADER = ["Part Number", "Description", "Quantity"];

export interface BoqRow {
  partNumber: string | null;
  description: string;
  quantity: number;
}

export interface ComposeDocxImage {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface ComposeDocxInput {
  /** Cover template bytes; may contain {{token}} placeholders. */
  cover: Buffer;
  /** Ordered, already-filtered (included) section bytes; may contain {{token}} and a lone {{boq.table}}. */
  sections: Buffer[];
  /** Empty array removes any {{boq.table}} marker without inserting a table. */
  boqRows: BoqRow[];
  /** Token (without braces, e.g. "customer.name") -> resolved display value. */
  context: Record<string, string>;
  /**
   * Token (without braces, e.g. "brand.logo") -> image to insert in place of
   * every occurrence, anywhere in the cover or any section. A token with no
   * image available should instead be passed as an empty string in `context`
   * (removed like any other resolved-to-nothing token) rather than listed
   * here — these two maps are meant to be disjoint.
   */
  images?: Record<string, ComposeDocxImage>;
}

export interface ComposeDocxResult {
  buffer: Buffer;
  /** Distinct {{token}} patterns still present after composing — not in `context`/`images`. */
  missingTokens: string[];
}

/** Fill every {{token}} in `context` throughout the document, in place. */
async function fillPlaceholders(doc: SuperDocDocument, context: Record<string, string>): Promise<void> {
  for (const [token, value] of Object.entries(context)) {
    const pattern = `{{${token}}}`;
    // Loop rather than batch-replacing every initial match: a replace shifts
    // downstream text, and re-querying after each one is the only way we've
    // verified stays correct when a token appears more than once.
    for (;;) {
      const match = await doc.query.match({ select: { type: "text", pattern, mode: "contains" }, require: "any" });
      if (match.total === 0) break;
      await doc.replace({ ref: match.items[0].handle.ref, text: value });
    }
  }
}

/**
 * Replace a lone {{boq.table}} marker with a real table, or remove it if
 * there are no rows. Assumes at most one marker per document (the app's
 * existing convention — "put {{boq.table}} on its own line"). Returns
 * whether a marker was found at all, so the caller can fall back to
 * auto-appending a BoQ section when no section placed one anywhere.
 */
async function fillBoqTable(doc: SuperDocDocument, rows: BoqRow[]): Promise<boolean> {
  const match = await doc.query.match({ select: { type: "text", pattern: BOQ_TOKEN, mode: "contains" }, require: "any" });
  if (match.total === 0) return false;

  if (rows.length === 0) {
    await doc.delete({ ref: match.items[0].handle.ref });
    return true;
  }

  const header = BOQ_TABLE_HEADER;
  // `at: {kind:"after", target}` positions the new block right after the
  // marker's own paragraph. The obvious `ref: match.handle.ref` (what the
  // SDK's own docs recommend for *content* operations) silently inserts at
  // the end of the document instead for create.table/create.image — confirmed
  // by direct reproduction (a table "after the marker" landed after
  // everything else in the document, even unrelated later paragraphs). Not in
  // the generated types yet either (upstream gap, @superdoc/sdk 2.12.0) —
  // hence the cast.
  const created = await doc.create.table({
    rows: rows.length + 1,
    columns: header.length,
    at: { kind: "after", target: match.items[0].address },
  } as Parameters<typeof doc.create.table>[0]);
  const nodeId = created.table.nodeId;
  const setCell = (rowIndex: number, columnIndex: number, text: string) =>
    doc.tables.setCellText({ target: { kind: "block", nodeType: "table", nodeId }, rowIndex, columnIndex, text });

  await Promise.all(header.map((text, columnIndex) => setCell(0, columnIndex, text)));
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    await Promise.all([setCell(r + 1, 0, row.partNumber ?? ""), setCell(r + 1, 1, row.description), setCell(r + 1, 2, String(row.quantity))]);
  }

  // create.table anchors at the match, it doesn't consume it (same behavior
  // as create.image) — the "{{boq.table}}" text is still there afterward.
  // Re-match (the first ref is stale after the mutations above) and delete it.
  const leftover = await doc.query.match({ select: { type: "text", pattern: BOQ_TOKEN, mode: "contains" }, require: "any" });
  if (leftover.total > 0) await doc.delete({ ref: leftover.items[0].handle.ref });
  return true;
}

/**
 * Replace every occurrence of each {{token}} in `images` with the given
 * image, anywhere in `doc`. Same anchor-not-consume pattern as the BoQ table
 * and the section-image patch-in below: `create.image` anchors at the match
 * without consuming it, so the marker text is deleted afterward.
 */
async function fillImageTokens(doc: SuperDocDocument, images: Record<string, ComposeDocxImage>): Promise<void> {
  for (const [token, image] of Object.entries(images)) {
    const pattern = `{{${token}}}`;
    const src = `data:${sniffImageMime(image.buffer)};base64,${image.buffer.toString("base64")}`;
    for (;;) {
      const match = await doc.query.match({ select: { type: "text", pattern, mode: "contains" }, require: "any" });
      if (match.total === 0) break;
      await doc.create.image({
        src,
        at: { kind: "inParagraph", target: match.items[0].address },
        size: { width: image.width, height: image.height },
      } as Parameters<typeof doc.create.image>[0]);
      const leftover = await doc.query.match({ select: { type: "text", pattern, mode: "contains" }, require: "any" });
      if (leftover.total > 0) await doc.delete({ ref: leftover.items[0].handle.ref });
    }
  }
}

interface ExtractedImage {
  buffer: Buffer;
  /** Original placement size in px, so the composed copy keeps the author's sizing rather than a hardcoded default. */
  width: number;
  height: number;
}

/** Extract every image's raw bytes (and original size) from a .docx file, in document order. */
async function extractImages(client: SuperDocClient, path: string): Promise<ExtractedImage[]> {
  const doc = await client.open({ doc: path });
  const items: { mediaPath: string; width: number; height: number }[] = [];
  try {
    const list = await doc.images.list();
    for (const item of list.items) {
      const props = item.properties as { src?: string; size?: { width?: number; height?: number } } | undefined;
      if (props?.src) items.push({ mediaPath: props.src, width: props.size?.width ?? 100, height: props.size?.height ?? 100 });
    }
  } finally {
    await doc.close({ discard: true }).catch(() => {});
  }

  // doc.images.get() (SDK) returns metadata only, never raw bytes (confirmed
  // empirically) — properties.src is always a real word/media/<hash> path
  // inside the package, so read it straight out of the zip instead.
  const zip = await JSZip.loadAsync(await readFile(path));
  const result: ExtractedImage[] = [];
  for (const { mediaPath, width, height } of items) {
    const entry = zip.file(mediaPath);
    if (!entry) throw new Error(`Image part ${mediaPath} listed but missing from ${path}`);
    result.push({ buffer: await entry.async("nodebuffer"), width, height });
  }
  return result;
}

/**
 * getHtml() renders list items with `list-style-type:none` plus the resolved
 * bullet/number baked in as literal text (`<span data-superdoc-list-label>●
 * &#9;</span>`) — its own numbering doesn't map cleanly to HTML semantics, so
 * it exports the visible result instead. But master.insert() reconstructs a
 * *real* list from the surrounding <ul>/<li> regardless of that inline style,
 * so re-inserting the literal label text produces a double marker ("• ●
 * item"), confirmed visually via docx-to-pdf. Stripping the label spans here
 * leaves a plain semantic list that master renders with a single bullet.
 */
function stripListLabelSpans(html: string): string {
  return html.replace(/<span[^>]*\bdata-superdoc-list-label\b[^>]*>[\s\S]*?<\/span>/g, "");
}

/**
 * getHtml() drops every non-text object (not just images) to a
 * `<span data-superdoc-placeholder="...">MARKER</span>`, but the marker text
 * isn't always "[image]" — confirmed via a real production document where
 * every image had a legacy VML `<w:pict>` fallback alongside its `<w:drawing>`
 * (typical of content pasted from Outlook, or produced by a non-SuperDoc
 * converter like the LibreOffice HTML→docx bridge legacy sections still go
 * through): SuperDoc classified all 29 of them as `data-superdoc-placeholder
 * ="object"` → "[embedded object]", not "[image]", so a hardcoded "[image]"
 * search found zero markers and `appendSection` threw on the very first one.
 * Reading the actual marker text out of the section's own getHtml() output
 * (in document order) instead of assuming a fixed string means this holds for
 * whatever variant SuperDoc happens to emit, known or not yet seen.
 */
function extractPlaceholderMarkers(html: string): string[] {
  const markers: string[] = [];
  const re = /<span[^>]*\bdata-superdoc-placeholder\b[^>]*>([\s\S]*?)<\/span>/g;
  for (const m of html.matchAll(re)) markers.push(m[1]);
  return markers;
}

/**
 * A block (confirmed: a table; not fully ruled out for other block types)
 * that ends up as the very last node of one `master.insert({type:"html"})`
 * call gets silently displaced to the end of the *whole* document by a
 * later `insert()` call — confirmed by direct reproduction (insert HTML
 * ending in a table, then insert more HTML: the table jumps after the new
 * content instead of staying put). A trailing paragraph after the section's
 * own content keeps it from ever being that last node.
 */
const TRAILING_GUARD_PARAGRAPH = "<p>&#8203;</p>";

/** Insert a filled section's content into `master`, images included. */
async function appendSection(client: SuperDocClient, master: SuperDocDocument, sectionPath: string, images: ExtractedImage[]): Promise<void> {
  const section = await client.open({ doc: sectionPath });
  const strippedHtml = stripListLabelSpans(await section.getHtml());
  const markers = extractPlaceholderMarkers(strippedHtml);
  const html = strippedHtml + TRAILING_GUARD_PARAGRAPH;
  await section.close({ discard: true }).catch(() => {});

  await master.insert({ type: "html", value: html });

  if (markers.length !== images.length) {
    // A real fidelity bug (an image silently didn't survive the HTML round
    // trip, or a non-image object got miscounted as one) — surface it
    // instead of guessing which marker belongs to which image.
    throw new Error(
      `${sectionPath}: found ${images.length} image(s) but ${markers.length} placeholder marker(s) in its exported HTML`,
    );
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const marker = markers[i];
    const match = await master.query.match({ select: { type: "text", pattern: marker, mode: "contains" }, require: "any" });
    if (match.total === 0) {
      throw new Error(`Expected a "${marker}" marker for an image from ${sectionPath} but found none`);
    }
    const src = `data:${sniffImageMime(image.buffer)};base64,${image.buffer.toString("base64")}`;
    // `at: {kind:"inParagraph", target}` places the image inline within the
    // marker's own paragraph. `ref: match.handle.ref` (the obvious choice,
    // and what the SDK's docs recommend generally) silently inserts at the
    // end of the whole document instead — confirmed by direct reproduction.
    // Not in the generated types yet either (upstream gap, @superdoc/sdk
    // 2.12.0) — hence the cast. Size MUST be nested (`size: {width, height}`)
    // — top-level width/height are silently ignored (confirmed: produced a
    // 2x2px image regardless of the requested size).
    await master.create.image({
      src,
      at: { kind: "inParagraph", target: match.items[0].address },
      size: { width: image.width, height: image.height },
    } as Parameters<typeof master.create.image>[0]);

    // create.image anchors at the match, it doesn't consume it — the marker
    // text is still there afterward. Re-match (the first ref is stale after
    // that mutation) and delete it.
    const leftover = await master.query.match({ select: { type: "text", pattern: marker, mode: "contains" }, require: "any" });
    if (leftover.total > 0) await master.delete({ ref: leftover.items[0].handle.ref });
  }
}

/**
 * Compose a cover + ordered sections + a BoQ table into one proposal .docx,
 * with every {{token}} in `context`/`images` resolved throughout.
 */
export async function composeProposalDocx(input: ComposeDocxInput): Promise<ComposeDocxResult> {
  const dir = await mkdtemp(join(tmpdir(), "compose-docx-"));
  const client = new SuperDocClient();
  try {
    await client.connect();

    const coverPath = join(dir, "cover.docx");
    await writeFile(coverPath, input.cover);
    const sectionPaths = await Promise.all(
      input.sections.map(async (buf, i) => {
        const path = join(dir, `section-${i}.docx`);
        await writeFile(path, buf);
        return path;
      }),
    );

    // Fill placeholders (text, images, and the BoQ table) in every document
    // before composing — the master accumulates HTML exports of already-
    // resolved content, so there's nothing left to resolve after composition.
    let boqMarkerFound = false;
    for (const path of [coverPath, ...sectionPaths]) {
      const doc = await client.open({ doc: path });
      await fillPlaceholders(doc, input.context);
      if (input.images) await fillImageTokens(doc, input.images);
      if (await fillBoqTable(doc, input.boqRows)) boqMarkerFound = true;
      await doc.save();
      await doc.close();
    }

    // Extract images before composing (sequential — concurrent sessions
    // against one client showed cross-session content issues in the Phase 0
    // spike; root cause wasn't the SDK there, but there's no evidence
    // concurrent opens are safe either, so this stays sequential deliberately).
    const sectionImages: ExtractedImage[][] = [];
    for (const path of sectionPaths) {
      sectionImages.push(await extractImages(client, path));
    }

    const master = await client.open({ doc: coverPath });
    try {
      for (let i = 0; i < sectionPaths.length; i++) {
        await appendSection(client, master, sectionPaths[i], sectionImages[i]);
      }

      // No section (or the cover) placed a {{boq.table}} marker anywhere,
      // but there are rows to show — append a BoQ section at the very end
      // rather than silently dropping the items, matching the old HTML
      // pipeline's same fallback. Reuses fillBoqTable itself (insert a fresh
      // marker via the already-proven insert({type:"html"}) append path,
      // then let it do the real work) instead of a separate create.table
      // recipe targeting "end of document", which the SDK has no direct
      // concept of (`at` always anchors relative to an existing node).
      if (!boqMarkerFound && input.boqRows.length > 0) {
        await master.insert({ type: "html", value: `<h2>Bill of Quantities</h2><p>${BOQ_TOKEN}</p>${TRAILING_GUARD_PARAGRAPH}` });
        await fillBoqTable(master, input.boqRows);
      }

      // Any {{token}} still literally present at this point had no value in
      // `context`/`images` — surfaced to the caller as a warning (same intent
      // as the old HTML pipeline's `missing` tracking), not an error.
      const finalText = await master.getText();
      const missingTokens = [...new Set([...finalText.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];

      const outPath = join(dir, "composed.docx");
      await master.save({ out: outPath });
      return { buffer: await readFile(outPath), missingTokens };
    } finally {
      await master.close({ discard: true }).catch(() => {});
    }
  } finally {
    await client.dispose().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
}
