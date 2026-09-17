import { convertWithSoffice } from "@/lib/render/soffice";

/**
 * Converts a .docx buffer to PDF via headless LibreOffice, replacing the
 * former Puppeteer/HTML PDF path now that the source of truth is a real
 * .docx (see src/lib/render/compose-docx.ts).
 */
export async function docxToPdf(docx: Buffer): Promise<Buffer> {
  return convertWithSoffice(docx, "docx", "pdf", "pdf");
}
