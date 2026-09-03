/**
 * Placeholder resolution for proposal section bodies.
 *
 * Section templates are authored as TipTap / ProseMirror JSON. Authors embed
 * tokens like {{customer.name}} or {{proposal.date}} in text. At generation
 * time we deep-clone the doc and substitute tokens against a context object.
 *
 * Block-level tokens (a paragraph whose entire text is a single token, e.g.
 * {{boq.table}}) are reported via `blockTokens` so the assembler can swap in a
 * real table node.
 */

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export type PlaceholderContext = Record<string, unknown>;

export interface ResolveResult {
  doc: unknown;
  /** Tokens found that had no matching context value. */
  missing: string[];
  /** Paragraph-only tokens, e.g. "boq.table", with their node path index. */
  blockTokens: { token: string; path: number[] }[];
}

function getPath(ctx: PlaceholderContext, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);
}

export function extractTokens(text: string): string[] {
  return [...text.matchAll(TOKEN_RE)].map((m) => m[1]);
}

export function resolvePlaceholders(
  input: unknown,
  ctx: PlaceholderContext,
): ResolveResult {
  const missing = new Set<string>();
  const blockTokens: ResolveResult["blockTokens"] = [];

  const walk = (node: unknown, path: number[]): unknown => {
    if (Array.isArray(node)) {
      return node.map((child, i) => walk(child, [...path, i]));
    }
    if (!node || typeof node !== "object") return node;

    const n = node as Record<string, unknown>;

    // Detect a paragraph that is exactly one token → block token.
    if (
      n.type === "paragraph" &&
      Array.isArray(n.content) &&
      n.content.length === 1 &&
      (n.content[0] as Record<string, unknown>)?.type === "text"
    ) {
      const raw = String((n.content[0] as Record<string, unknown>).text ?? "").trim();
      const solo = raw.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
      if (solo) {
        blockTokens.push({ token: solo[1], path });
      }
    }

    if (n.type === "text" && typeof n.text === "string") {
      const replaced = n.text.replace(TOKEN_RE, (_, token: string) => {
        const value = getPath(ctx, token);
        if (value === undefined || value === null) {
          missing.add(token);
          return `{{${token}}}`;
        }
        return String(value);
      });
      return { ...n, text: replaced };
    }

    const out: Record<string, unknown> = { ...n };
    if (Array.isArray(n.content)) {
      out.content = n.content.map((child, i) => walk(child, [...path, i]));
    }
    return out;
  };

  return {
    doc: walk(input, []),
    missing: [...missing],
    blockTokens,
  };
}

/** Build the context object passed to resolvePlaceholders. */
export function buildContext(args: {
  customerName: string;
  customerWebsite?: string | null;
  proposalTitle: string;
  proposalDate: Date;
  reference?: string | null;
}): PlaceholderContext {
  return {
    customer: {
      name: args.customerName,
      website: args.customerWebsite ?? "",
    },
    proposal: {
      title: args.proposalTitle,
      date: args.proposalDate.toISOString().slice(0, 10),
      reference: args.reference ?? "",
    },
  };
}
