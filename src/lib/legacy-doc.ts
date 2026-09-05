/**
 * Best-effort conversion of a pre-CKEditor ProseMirror/TipTap document to HTML,
 * with no TipTap dependency. Used only as a client-side fallback so an author
 * who opens a not-yet-migrated section still sees their content and can keep it.
 * The authoritative conversion is `scripts/migrate-section-bodies.ts`, which
 * uses the real TipTap serialiser.
 */

type Node = {
  type?: string;
  text?: string;
  content?: Node[];
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
};

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(node: Node): string {
  if (node.type === "text") {
    let out = escapeText(node.text ?? "");
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold": out = `<strong>${out}</strong>`; break;
        case "italic": out = `<i>${out}</i>`; break;
        case "underline": out = `<u>${out}</u>`; break;
        case "strike": out = `<s>${out}</s>`; break;
        case "code": out = `<code>${out}</code>`; break;
        case "link": {
          const href = String(mark.attrs?.href ?? "#");
          out = `<a href="${escapeText(href)}">${out}</a>`;
          break;
        }
      }
    }
    return out;
  }
  if (node.type === "hardBreak") return "<br>";
  return (node.content ?? []).map(inline).join("");
}

function block(node: Node): string {
  const kids = node.content ?? [];
  switch (node.type) {
    case "doc":
      return kids.map(block).join("");
    case "paragraph": {
      const inner = kids.map(inline).join("");
      return inner ? `<p>${inner}</p>` : "<p>&nbsp;</p>";
    }
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      return `<h${level}>${kids.map(inline).join("")}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${kids.map(block).join("")}</ul>`;
    case "orderedList":
      return `<ol>${kids.map(block).join("")}</ol>`;
    case "listItem":
      return `<li>${kids.map(block).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${kids.map(block).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${kids.map(inline).join("")}</code></pre>`;
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const src = escapeText(String(node.attrs?.src ?? ""));
      const alt = escapeText(String(node.attrs?.alt ?? ""));
      return src ? `<figure class="image"><img src="${src}" alt="${alt}"></figure>` : "";
    }
    case "table":
      return `<figure class="table"><table>${kids.map(block).join("")}</table></figure>`;
    case "tableRow":
      return `<tr>${kids.map(block).join("")}</tr>`;
    case "tableHeader":
      return `<th>${kids.map(block).join("")}</th>`;
    case "tableCell":
      return `<td>${kids.map(block).join("")}</td>`;
    default:
      return kids.length ? kids.map(block).join("") : "";
  }
}

export function isLegacyProseMirrorDoc(v: unknown): v is Node {
  return !!v && typeof v === "object" && (v as Node).type === "doc";
}

export function legacyDocToHtml(doc: unknown): string {
  if (!isLegacyProseMirrorDoc(doc)) return "";
  try {
    return block(doc);
  } catch {
    return "";
  }
}
