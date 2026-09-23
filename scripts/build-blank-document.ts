/**
 * Builds the near-empty .docx a brand-new section opens from — OnlyOffice's
 * editor config always needs a real document URL, unlike the old SuperDoc
 * editor which could start with no `document` prop. Saved via storage.ts at
 * a fixed filename (not a random UUID) so constants.ts::BLANK_DOCUMENT_URL
 * can point at it directly.
 *
 *   npx tsx scripts/build-blank-document.ts               # local (.env STORAGE_DIR)
 *   railway run npx tsx scripts/build-blank-document.ts    # against Railway's volume
 */
import { Document, Packer, Paragraph } from "docx";
import { saveFile } from "../src/lib/storage";

async function main() {
  const doc = new Document({ sections: [{ children: [new Paragraph("")] }] });
  const buf = await Packer.toBuffer(doc);
  const { url } = await saveFile(buf, {
    prefix: "defaults",
    ext: "docx",
    filename: "blank.docx",
  });
  console.log("Saved blank starter document to:", url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
