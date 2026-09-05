import puppeteer from "puppeteer";

export interface PdfOptions {
  headerText?: string | null;
  footerText?: string | null;
  showPageNumbers?: boolean;
}

export async function htmlToPdf(
  html: string,
  opts: PdfOptions = {},
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Embedded @font-face (base64 data URI) still decodes asynchronously —
    // wait for it so the PDF doesn't get rasterized with a fallback font.
    await page.evaluateHandle("document.fonts.ready");

    const header = opts.headerText
      ? `<div style="font-size:8px;width:100%;padding:0 12mm;color:#94a3b8">${escapeText(
          opts.headerText,
        )}</div>`
      : `<div></div>`;

    const footer = `<div style="font-size:8px;width:100%;padding:0 12mm;color:#94a3b8;display:flex;justify-content:space-between">
      <span>${escapeText(opts.footerText ?? "")}</span>
      ${
        opts.showPageNumbers
          ? `<span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>`
          : `<span></span>`
      }
    </div>`;

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: Boolean(opts.headerText || opts.footerText || opts.showPageNumbers),
      headerTemplate: header,
      footerTemplate: footer,
      margin: { top: "18mm", bottom: "18mm", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
