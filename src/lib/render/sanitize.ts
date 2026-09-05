import sanitizeHtml from "sanitize-html";

/**
 * Whitelist-sanitise the HTML produced by the CKEditor section editor before it
 * is stored or rendered into a proposal. Authors are trusted staff, but the
 * output still passes through PDF/DOCX renderers and an authenticated preview,
 * so we keep the surface tight: no scripts, no event handlers, no arbitrary
 * URL schemes, and a fixed set of inline style properties.
 */

const COLOUR =
  /^(#(0x)?[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]+)$/i;
const LENGTH = /^-?[\d.]+(px|em|rem|%|pt|vw|vh)$/;
const BORDER = /^[\d.]+(px|em|rem|pt)?\s+(none|solid|dashed|dotted|double)\s+.+$/i;

const styleAllow: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    color: [COLOUR],
    "background-color": [COLOUR],
    "text-align": [/^(left|right|center|justify)$/],
    "font-size": [LENGTH, /^(x?x-small|small|medium|large|x?x-large)$/],
    "font-family": [/^[\w\s",'-]+$/],
    "font-weight": [/^(normal|bold|[1-9]00)$/],
    width: [LENGTH],
    height: [LENGTH],
    border: [BORDER, /^none$/],
    "border-top": [BORDER, /^none$/],
    "border-right": [BORDER, /^none$/],
    "border-bottom": [BORDER, /^none$/],
    "border-left": [BORDER, /^none$/],
    "border-color": [/^[\w\s#(),.%-]+$/],
    "border-style": [/^(none|solid|dashed|dotted|double)$/],
    "border-width": [/^[\d.\spxemrt]+$/],
    padding: [/^[\d.\spxemrt%]+$/],
    "vertical-align": [/^(top|middle|bottom|baseline)$/],
    float: [/^(left|right|none)$/],
    "page-break-after": [/^(always|auto|avoid)$/],
    "page-break-before": [/^(always|auto|avoid)$/],
  },
};

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "span",
    "a", "ul", "ol", "li",
    "figure", "figcaption", "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "col", "colgroup",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    col: ["span"],
    colgroup: ["span"],
    "*": ["class", "style"],
  },
  allowedClasses: {
    "*": [
      "image", "image_resized", "image-style-*", "image-inline",
      "table", "page-break", "page-break__label",
      "text-tiny", "text-small", "text-big", "text-huge",
      "marker-yellow", "marker-green", "marker-pink", "marker-blue",
      "pen-red", "pen-green",
    ],
  },
  allowedStyles: styleAllow,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"], a: ["http", "https", "mailto", "tel"] },
  allowProtocolRelative: false,
  // Keep relative /api/files/... image URLs (inlined later by the assembler).
  allowedSchemesAppliedToAttributes: ["href", "src"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

/** Sanitise a section-body HTML string. Non-strings collapse to "". */
export function sanitizeSectionHtml(html: unknown): string {
  if (typeof html !== "string" || html.trim() === "") return "";
  return sanitizeHtml(html, options);
}
