import HTMLtoDOCX from "@turbodocx/html-to-docx";

export interface DocxOptions {
  title?: string;
  footerText?: string | null;
  showPageNumbers?: boolean;
}

/**
 * Convert assembled HTML to a .docx Buffer.
 * html-to-docx supports a subset of CSS; the assembler keeps the markup simple
 * (tables, headings, paragraphs, lists, base64 images).
 */
export async function htmlToDocxBuffer(
  html: string,
  opts: DocxOptions = {},
): Promise<Buffer> {
  const footer = opts.footerText
    ? `<p style="font-size:8pt;color:#94a3b8">${opts.footerText}</p>`
    : undefined;

  const result = await HTMLtoDOCX(
    html,
    null,
    {
      title: opts.title,
      footer: Boolean(footer),
      pageNumber: Boolean(opts.showPageNumbers),
      table: { row: { cantSplit: true } },
      font: "Calibri",
      fontSize: 22, // half-points => 11pt
    },
    footer,
  );

  if (Buffer.isBuffer(result)) return result;
  if (result instanceof ArrayBuffer) return Buffer.from(result);
  // Blob (browser-like envs)
  const blob = result as unknown as Blob;
  return Buffer.from(await blob.arrayBuffer());
}
