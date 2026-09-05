import { parse, type HTMLElement } from "node-html-parser";
import { buildContext, resolvePlaceholdersInHtml } from "@/lib/placeholders";
import { sectionBodyToHtml } from "@/lib/render/section-html";
import { toDataUri } from "@/lib/storage";
import {
  esc,
  inlineFileImages,
  type AssembleInput,
  type AssembleResult,
} from "@/lib/render/assemble";

/**
 * The PDF/preview HTML relies almost entirely on a <style> block (CSS
 * variables, fl* layout, gradients, class selectors). `@turbodocx/html-to-docx`
 * ignores <style> blocks completely and only reads *inline* styles on
 * elements, so feeding it that HTML produces an unstyled document.
 *
 * This builds a second, DOCX-tailored HTML string: brand colours resolved to
 * literals, every visual rule pushed inline, CKEditor's <figure> wrappers
 * unwrapped, and tables given real borders — so the .docx tracks the PDF.
 */

const MARKERS: Record<string, string> = {
  "marker-yellow": "background-color:#fdfd77",
  "marker-green": "background-color:#7ee686",
  "marker-pink": "background-color:#fc7899",
  "marker-blue": "background-color:#72cdfd",
  "pen-red": "color:#e71313",
  "pen-green": "color:#128a00",
};
const TEXT_SIZES: Record<string, string> = {
  "text-tiny": "font-size:8pt",
  "text-small": "font-size:9pt",
  "text-big": "font-size:14pt",
  "text-huge": "font-size:18pt",
};
const HEADING_PT: Record<string, string> = {
  h1: "16pt",
  h2: "14pt",
  h3: "12.5pt",
  h4: "11.5pt",
  h5: "11pt",
  h6: "10.5pt",
};

function appendStyle(el: HTMLElement, css: string): void {
  const cur = (el.getAttribute("style") ?? "").trim().replace(/;?\s*$/, "");
  el.setAttribute("style", cur ? `${cur};${css}` : css);
}

function cssWidthOf(style: string | null | undefined): string | null {
  const m = /(?:^|;)\s*width\s*:\s*([^;]+)/i.exec(style ?? "");
  const v = m?.[1].trim();
  return v && v !== "auto" ? v : null;
}

/**
 * CKEditor stores an image resize as a `width` style on the <figure> (block
 * image) or the <img> (inline), while `ImageSizeAttributes` writes the image's
 * *natural* pixel size to `width`/`height` attributes. turbodocx takes those
 * attributes literally, so a resized image renders at full pixel size and
 * overflows the page. Keep only the display width (as-is: `%` scales to the
 * page, `px` is capped by `max-width:100%`), drop the rest.
 */
function normalizeDocxImage(img: HTMLElement, figureWidth?: string | null): void {
  const width = figureWidth ?? cssWidthOf(img.getAttribute("style"));
  img.removeAttribute("width");
  img.removeAttribute("height");
  const parts = width ? [`width:${width}`, "max-width:100%"] : ["max-width:100%"];
  img.setAttribute("style", parts.join(";"));
}

/** Rewrite one section's CKEditor HTML into inline-styled, DOCX-friendly markup. */
function docxifySectionHtml(
  html: string,
  brand: { primary: string; secondary: string },
): string {
  if (!html.trim()) return "";
  const root = parse(html, { comment: false });

  // Unwrap <figure> — turbodocx doesn't treat it as a block, which breaks
  // nested tables/images. Keep alignment intent from the image-style classes.
  for (const fig of root.querySelectorAll("figure")) {
    const cls = fig.getAttribute("class") ?? "";
    const align = cls.includes("align-left")
      ? "left"
      : cls.includes("align-right") || cls.includes("image-style-side")
        ? "right"
        : "center";
    const img = fig.querySelector("img");
    const cap = fig.querySelector("figcaption");
    if (img) {
      normalizeDocxImage(img, cssWidthOf(fig.getAttribute("style")));
      const capHtml = cap
        ? `<p style="text-align:${align};font-size:9pt;color:#64748b;margin:0 0 6pt">${cap.innerHTML}</p>`
        : "";
      fig.replaceWith(
        `<p style="text-align:${align};margin:6pt 0">${img.outerHTML}</p>${capHtml}`,
      );
    } else {
      // table figure — unwrap, keep inner markup (table + optional caption)
      fig.replaceWith(fig.innerHTML);
    }
  }

  // Inline images (and anything the figure pass missed) — clamp the same way.
  for (const img of root.querySelectorAll("img")) {
    normalizeDocxImage(img);
  }

  for (const cap of root.querySelectorAll("figcaption")) {
    cap.replaceWith(
      `<p style="font-size:9pt;color:#64748b;margin:2pt 0">${cap.innerHTML}</p>`,
    );
  }

  for (const table of root.querySelectorAll("table")) {
    table.setAttribute("border", "1");
    appendStyle(table, "border-collapse:collapse;width:100%;font-size:10pt;margin:6pt 0");
    for (const cell of table.querySelectorAll("th,td")) {
      appendStyle(cell, "border:1px solid #cbd5e1;padding:4pt 6pt;vertical-align:top");
      if (cell.rawTagName?.toLowerCase() === "th") {
        appendStyle(cell, "background-color:#f1f5f9;font-weight:bold;text-align:left");
      }
    }
  }

  for (const bq of root.querySelectorAll("blockquote")) {
    appendStyle(
      bq,
      `border-left:3px solid ${brand.primary};padding-left:8pt;color:#475569;margin:6pt 0`,
    );
  }
  for (const a of root.querySelectorAll("a")) {
    appendStyle(a, `color:${brand.primary}`);
  }
  for (const pre of root.querySelectorAll("pre")) {
    appendStyle(
      pre,
      "font-family:'Courier New',monospace;background-color:#f1f5f9;padding:6pt;font-size:9.5pt",
    );
  }
  for (const [tag, pt] of Object.entries(HEADING_PT)) {
    for (const h of root.querySelectorAll(tag)) {
      appendStyle(h, `color:${brand.secondary};font-weight:bold;font-size:${pt};margin:10pt 0 4pt`);
    }
  }
  for (const el of root.querySelectorAll("[class]")) {
    const classes = (el.getAttribute("class") ?? "").split(/\s+/);
    for (const c of classes) {
      if (MARKERS[c]) appendStyle(el, MARKERS[c]);
      if (TEXT_SIZES[c]) appendStyle(el, TEXT_SIZES[c]);
    }
  }

  return root.toString();
}

function boqTableDocxHtml(
  items: AssembleInput["boqItems"],
  brand: { primary: string },
): string {
  if (!items.length) return "<p><em>No items.</em></p>";
  const th = `background-color:${brand.primary};color:#ffffff;padding:5pt 7pt;text-align:left;font-weight:bold;border:1px solid ${brand.primary}`;
  const td = "padding:5pt 7pt;border:1px solid #e4e4e7;vertical-align:top";
  const head = `<tr>${["#", "Part No.", "Description", "Qty"]
    .map((c) => `<th style="${th}">${c}</th>`)
    .join("")}</tr>`;
  const rows = items
    .map((it, i) => {
      const cells = [
        String(i + 1),
        esc(it.partNumber ?? ""),
        esc(it.description),
        String(it.quantity),
      ];
      return `<tr>${cells.map((c) => `<td style="${td}">${c}</td>`).join("")}</tr>`;
    })
    .join("");
  return `<table border="1" style="border-collapse:collapse;width:100%;font-size:10pt;margin:6pt 0">${head}${rows}</table>`;
}

export async function assembleProposalDocxHtml(
  input: AssembleInput,
): Promise<AssembleResult> {
  const brand = {
    primary: input.brand.primaryColor,
    secondary: input.brand.secondaryColor,
  };
  const font = `${input.brand.fontFamily}, Calibri, Arial, sans-serif`;

  const ctx = buildContext({
    customerName: input.customer.name,
    customerWebsite: input.customer.website,
    proposalTitle: input.proposal.title,
    proposalDate: input.proposal.proposalDate,
    reference: input.proposal.reference,
    contactName: input.proposal.contactName,
    contactTitle: input.proposal.contactTitle,
    contactEmail: input.proposal.contactEmail,
    contactPhone: input.proposal.contactPhone,
  });

  const missing = new Set<string>();
  const boqHtml = boqTableDocxHtml(input.boqItems, brand);

  let boqRendered = false;
  let sectionHtml = input.sections
    .map((s) => {
      const { html: resolved, missing: m } = resolvePlaceholdersInHtml(
        sectionBodyToHtml(s.body),
        ctx,
      );
      m.forEach((t) => missing.add(t));
      const body = docxifySectionHtml(resolved, brand).replace(
        /<p>\s*\{\{\s*boq\.table\s*\}\}\s*<\/p>/gi,
        () => {
          boqRendered = true;
          return boqHtml;
        },
      );
      return (
        `<h2 style="color:${brand.secondary};font-size:14pt;font-weight:bold;` +
        `border-bottom:2px solid ${brand.primary};padding-bottom:3pt;margin:16pt 0 8pt">` +
        `${esc(s.title)}</h2>${body}`
      );
    })
    .join("\n");
  sectionHtml = await inlineFileImages(sectionHtml);

  const boqSection =
    !boqRendered && input.boqItems.length
      ? `<h2 style="color:${brand.secondary};font-size:14pt;font-weight:bold;border-bottom:2px solid ${brand.primary};padding-bottom:3pt;margin:16pt 0 8pt">Bill of Quantities</h2>${boqHtml}`
      : "";

  const brandLogo = await toDataUri(input.brand.logoUrl);
  const custLogo = await toDataUri(input.customer.logoUrl);
  const dateStr = input.proposal.proposalDate.toISOString().slice(0, 10);

  const logos = [custLogo, brandLogo]
    .filter(Boolean)
    .map((src) => `<img src="${src}" style="height:44px" />`)
    .join("&nbsp;&nbsp;&nbsp;&nbsp;");

  const metaRow = (label: string, value: string) =>
    `<p style="color:#52525b;font-size:10.5pt;margin:2pt 0"><strong>${label}</strong> ${esc(value)}</p>`;

  const cover =
    (logos ? `<p style="margin:0 0 16pt">${logos}</p>` : "") +
    `<p style="color:${brand.primary};font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;font-size:9pt;margin:0 0 6pt">Technical Proposal</p>` +
    `<h1 style="color:${brand.secondary};font-size:24pt;font-weight:bold;margin:0 0 12pt">${esc(input.proposal.title)}</h1>` +
    metaRow("Prepared for:", input.customer.name) +
    (input.proposal.contactName
      ? metaRow(
          "Attn:",
          input.proposal.contactTitle
            ? `${input.proposal.contactName}, ${input.proposal.contactTitle}`
            : input.proposal.contactName,
        )
      : "") +
    (input.proposal.reference ? metaRow("Reference:", input.proposal.reference) : "") +
    metaRow("Date:", dateStr) +
    `<div style="page-break-after:always">&nbsp;</div>`;

  const html =
    `<!doctype html><html><head><meta charset="utf-8"></head>` +
    `<body style="font-family:${esc(font)};color:#141414;font-size:11pt;line-height:1.5">` +
    cover +
    sectionHtml +
    boqSection +
    `</body></html>`;

  return { html, missingTokens: [...missing] };
}
