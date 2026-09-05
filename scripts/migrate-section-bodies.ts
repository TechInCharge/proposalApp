/**
 * One-off: convert section bodies from the old ProseMirror/TipTap JSON format
 * to the CKEditor HTML-string format.
 *
 *   npx tsx scripts/migrate-section-bodies.ts          # local (.env DATABASE_URL)
 *   railway run npx tsx scripts/migrate-section-bodies.ts   # against Railway
 *
 * Idempotent: rows whose body is already a string are skipped.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { generateHTML } from "@tiptap/html/server";
import { editorExtensions } from "../src/lib/editor-extensions";
import { sanitizeSectionHtml } from "../src/lib/render/sanitize";

const prisma = new PrismaClient();

function isDoc(v: unknown): v is object {
  return !!v && typeof v === "object" && (v as { type?: unknown }).type === "doc";
}

function convert(body: Prisma.JsonValue): string | null {
  if (typeof body === "string") return null; // already migrated
  if (!isDoc(body)) return ""; // unknown/empty -> blank
  try {
    return sanitizeSectionHtml(generateHTML(body as object, editorExtensions));
  } catch (err) {
    console.warn("  ! render failed, storing blank:", err);
    return "";
  }
}

async function migrateModel(
  name: string,
  rows: { id: string; body: Prisma.JsonValue }[],
  update: (id: string, html: string) => Promise<unknown>,
) {
  let changed = 0;
  for (const row of rows) {
    const html = convert(row.body);
    if (html === null) continue;
    await update(row.id, html);
    changed++;
  }
  console.log(`${name}: ${changed}/${rows.length} converted`);
}

async function main() {
  const templates = await prisma.sectionTemplate.findMany({
    select: { id: true, body: true },
  });
  await migrateModel("SectionTemplate", templates, (id, html) =>
    prisma.sectionTemplate.update({
      where: { id },
      data: { body: html as unknown as Prisma.InputJsonValue },
    }),
  );

  const sections = await prisma.proposalSection.findMany({
    select: { id: true, body: true },
  });
  await migrateModel("ProposalSection", sections, (id, html) =>
    prisma.proposalSection.update({
      where: { id },
      data: { body: html as unknown as Prisma.InputJsonValue },
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
