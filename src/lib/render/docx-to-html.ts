import { convertWithSoffice } from "@/lib/render/soffice";

/**
 * Converts a .docx buffer to an HTML fragment (the `<body>` inner content
 * only — LibreOffice's HTML export wraps it in a full document with a
 * `<style>` block full of CSS selectors the section-body sanitizer doesn't
 * understand and would otherwise leak as literal text).
 *
 * BRIDGE: lets the still-HTML-based preview route (assemble.ts, via
 * section-html.ts::sectionBodyToHtml) read section/cover bodies that are
 * now .docx files, authored in the current SuperDoc editor. Not used by
 * actual generation (compose-proposal.ts reads .docx bodies directly) —
 * only by the live HTML preview, which stays HTML-based for now. Revisit if
 * that route is ever rebuilt on the composer too.
 */
export async function docxToHtmlFragment(docx: Buffer): Promise<string> {
  const html = (await convertWithSoffice(docx, "docx", "html", "html")).toString("utf-8");
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : html;
}
