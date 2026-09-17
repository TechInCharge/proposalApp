/**
 * Phase 0 spike (SuperDoc migration plan, see /Users/djenane/.claude/plans/abundant-rolling-dawn.md).
 *
 * Proves, against the real `@superdoc/sdk`, that we can:
 *   1. Fill `{{token}}` placeholders in a section .docx headlessly (no browser).
 *   2. Compose N filled sections + a cover into one master .docx.
 *   3. Carry images across that composition (the HTML round-trip used for step 2
 *      drops them silently — this fills them back in as a second pass).
 *
 * Findings baked into this script (see the plan file for the full writeup):
 * - Placeholder fill: doc.query.match({mode:'contains'}) + doc.replace(ref, text).
 *   No content-control authoring needed for plain tokens — literal {{token}}
 *   text keeps working exactly like the current CKEditor editor.
 * - Composition: doc.getHtml() on a filled section + doc.insert({type:'html'})
 *   into the master. Handles headings/paragraphs/formatting/tables. Reuses
 *   SuperDoc's own HTML<->OOXML conversion instead of hand-rolled XML splicing.
 * - Images: getHtml() replaces each image with a literal `[image]` marker and
 *   the master ends up with zero image nodes — there's nothing to patch after
 *   the fact. Fix: query.match each `[image]` marker in the master (in the
 *   same order the source doc's images.list() reports them) and
 *   doc.create.image({src: <base64 data URI>, ref, width, height}) at that ref.
 *
 * Run: npx tsx scripts/spike-compose-docx.ts
 *
 * This is a spike, not production code: fixtures are generated in-process
 * rather than pulled from real SectionTemplate rows, and error handling is
 * minimal. Phase 1 should lift the composeDocx()/fillPlaceholders() shape
 * into src/lib/render/compose-docx.ts once validated against real production
 * templates (tables with merged cells/shading, multiple images per section).
 */
import { SuperDocClient, type SuperDocDocument } from "@superdoc/sdk";
import { Document, Packer, Paragraph, HeadingLevel, ImageRun, Table, TableRow, TableCell, TextRun } from "docx";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";

const IMAGE_PLACEHOLDER = "[image]";

/** A 2x2 red PNG, just enough to prove image bytes survive composition. */
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJnADFmH76aAAAAAElFTkSuQmCC";

async function buildFixtures(dir: string) {
  const png = Buffer.from(SAMPLE_PNG_BASE64, "base64");

  const cover = new Document({
    sections: [{ children: [new Paragraph({ text: "Cover Page", heading: HeadingLevel.HEADING_1 }), new Paragraph("Prepared for {{customer.name}}.")] }],
  });
  await writeFile(join(dir, "cover.docx"), await Packer.toBuffer(cover));

  const section1 = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun("Dear "), new TextRun({ text: "{{customer.name}}", bold: true }), new TextRun(", thank you for considering {{proposal.title}}.")] }),
          new Paragraph({ children: [new ImageRun({ data: png, transformation: { width: 40, height: 40 }, type: "png" })] }),
        ],
      },
    ],
  });
  await writeFile(join(dir, "section1.docx"), await Packer.toBuffer(section1));

  const section2 = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Bill of Quantities", heading: HeadingLevel.HEADING_1 }),
          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Part")] }), new TableCell({ children: [new Paragraph("Qty")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("WIDGET-1")] }), new TableCell({ children: [new Paragraph("3")] })] }),
            ],
          }),
        ],
      },
    ],
  });
  await writeFile(join(dir, "section2.docx"), await Packer.toBuffer(section2));
}

/** Fill literal {{token}} placeholders in an already-open document, in place. */
async function fillPlaceholders(doc: SuperDocDocument, context: Record<string, string>) {
  for (const [token, value] of Object.entries(context)) {
    const pattern = `{{${token}}}`;
    // require: "any" so a section that doesn't use a given token is a no-op,
    // not an error — sections only reference the tokens relevant to them.
    const matches = await doc.query.match({ select: { type: "text", pattern, mode: "contains" }, require: "any" });
    for (const item of matches.items) {
      await doc.replace({ ref: item.handle.ref, text: value });
    }
  }
}

/**
 * Extract every image's bytes from a section doc, in document order.
 *
 * doc.images.get() (SDK) returns only metadata (same shape as .list()), never
 * raw bytes — confirmed empirically. properties.src is always a real
 * word/media/<hash>.ext path inside the .docx package, so this reads it
 * straight out of the zip instead of round-tripping through the SDK.
 */
async function extractImages(client: SuperDocClient, path: string): Promise<Buffer[]> {
  const doc = await client.open({ doc: path });
  const mediaPaths: string[] = [];
  try {
    const list = await doc.images.list();
    for (const item of list.items) {
      const src = (item.properties as { src?: string } | undefined)?.src;
      if (src) mediaPaths.push(src);
    }
  } finally {
    await doc.close({ discard: true }).catch(() => {});
  }

  const zip = await JSZip.loadAsync(await readFile(path));
  const buffers: Buffer[] = [];
  for (const mediaPath of mediaPaths) {
    const entry = zip.file(mediaPath);
    if (!entry) throw new Error(`Image part ${mediaPath} listed but missing from ${path}`);
    buffers.push(await entry.async("nodebuffer"));
  }
  return buffers;
}

/**
 * Compose a cover + N filled section docs into one master .docx.
 * Returns the master's saved path.
 */
async function composeDocx(client: SuperDocClient, coverPath: string, filledSectionPaths: string[], sectionImages: Buffer[][], outPath: string) {
  const master = await client.open({ doc: coverPath });
  try {
    for (let i = 0; i < filledSectionPaths.length; i++) {
      const section = await client.open({ doc: filledSectionPaths[i] });
      const html = await section.getHtml();
      await section.close({ discard: true }).catch(() => {});

      await master.insert({ type: "html", value: html });

      const images = sectionImages[i] ?? [];
      for (const imageBuffer of images) {
        const match = await master.query.match({ select: { type: "text", pattern: IMAGE_PLACEHOLDER, mode: "contains" }, require: "any" });
        if (match.total === 0) break; // more images than placeholders would be a fidelity bug worth surfacing loudly in Phase 1, not silently swallowing here
        const src = `data:image/png;base64,${imageBuffer.toString("base64")}`;
        // `ref` works at runtime (the SDK's own docs recommend it) but isn't
        // in create.image's generated types yet (upstream gap, @superdoc/sdk 2.12.0).
        await master.create.image({ src, ref: match.items[0].handle.ref, width: 100, height: 100 } as Parameters<typeof master.create.image>[0]);

        // create.image anchors the image at the match, it doesn't consume it —
        // the "[image]" marker text is still there afterward. Re-match (the
        // first ref is stale after the mutation above) and delete it.
        const leftover = await master.query.match({ select: { type: "text", pattern: IMAGE_PLACEHOLDER, mode: "contains" }, require: "any" });
        if (leftover.total > 0) await master.delete({ ref: leftover.items[0].handle.ref });
      }
    }
    await master.save({ out: outPath });
  } finally {
    await master.close({ discard: true }).catch(() => {});
  }
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "spike-compose-"));
  try {
    await buildFixtures(dir);

    const client = new SuperDocClient();
    await client.connect();
    try {
      const context = { "customer.name": "Acme Corp", "proposal.title": "Widget Deployment Proposal" };

      // Fill placeholders in the cover and each section, in place.
      for (const name of ["cover.docx", "section1.docx", "section2.docx"]) {
        const doc = await client.open({ doc: join(dir, name) });
        await fillPlaceholders(doc, context);
        await doc.save();
        await doc.close();
      }

      const sectionImages: Buffer[][] = [];
      for (const p of [join(dir, "section1.docx"), join(dir, "section2.docx")]) {
        sectionImages.push(await extractImages(client, p));
      }

      const outPath = join(dir, "composed.docx");
      await composeDocx(client, join(dir, "cover.docx"), [join(dir, "section1.docx"), join(dir, "section2.docx")], sectionImages, outPath);

      const verify = await client.open({ doc: outPath });
      const text = await verify.getText();
      const images = await verify.images.list();
      await verify.close({ discard: true }).catch(() => {});

      console.log("--- COMPOSED DOCUMENT TEXT ---");
      console.log(text);
      console.log(`\n--- IMAGES IN COMPOSED DOCUMENT: ${images.total} ---`);

      const finalBytes = await readFile(outPath);
      console.log(`\nComposed document: ${finalBytes.length} bytes at ${outPath}`);
      console.log(text.includes("{{") ? "FAIL: unresolved placeholder remains" : "OK: all placeholders resolved");
      console.log(images.total >= 1 ? "OK: image(s) carried through composition" : "FAIL: image(s) lost during composition");
    } finally {
      await client.dispose();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
