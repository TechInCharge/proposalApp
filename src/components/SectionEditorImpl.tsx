"use client";

import { useRef, useState } from "react";
import { SuperDocEditor } from "@superdoc/react";
import "@superdoc/react/style.css";
import type { SuperDoc } from "superdoc";

const DEFAULT_PLACEHOLDERS = [
  "customer.name",
  "customer.website",
  "proposal.title",
  "proposal.date",
  "proposal.reference",
  "contact.name",
  "contact.title",
  "contact.email",
  "contact.phone",
  "boq.table",
];

const DEFAULT_HINT = (
  <span className="text-xs text-slate-400">
    Put <code>{"{{boq.table}}"}</code> on its own line to drop in the Bill of
    Quantities table.
  </span>
);

/**
 * Section/cover bodies are `/api/files/section-bodies/<uuid>.docx` URLs — see
 * prisma/schema.prisma. `defaults/...` is also accepted: it's the stable path
 * of the built-in default cover template (see cover-constants.ts), which this
 * same editor loads for the CoverEditor's "Load default layout" button.
 */
function isDocxUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/api\/files\/(section-bodies|defaults)\/.+\.docx$/.test(value)
  );
}

export interface SectionEditorHandle {
  /** Export the editor's current content as .docx bytes. */
  getDocx(): Promise<Blob>;
}

export function SectionEditorImpl({
  value,
  onReady,
  placeholders = DEFAULT_PLACEHOLDERS,
  hint = DEFAULT_HINT,
}: {
  value: unknown;
  /** Called once the editor is live, handing back a handle for the parent's Save button to pull docx bytes from. */
  onReady: (handle: SectionEditorHandle) => void;
  placeholders?: string[];
  hint?: React.ReactNode;
}) {
  const instanceRef = useRef<SuperDoc | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // A non-empty value that isn't a docx URL is pre-migration content (HTML
  // string or legacy ProseMirror JSON) — scripts/migrate-section-bodies-to-docx.ts
  // converts those once; this editor doesn't attempt a runtime fallback render.
  const needsMigration = value != null && value !== "" && !isDocxUrl(value);

  function copyToken(token: string) {
    const text = `{{${token}}}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1200);
  }

  return (
    // `min-w-0` + `min-h-0` matter here, not just as belt-and-braces: this
    // component is always mounted inside `grid`/`flex` containers (Card ->
    // Editor -> SectionEditor, several levels deep across call sites), and a
    // flex/grid item's default min-size is `auto` — it refuses to shrink
    // below its content's intrinsic size. SuperDoc's toolbar/page content is
    // intrinsically wide, so without this the whole ancestor chain (up to
    // the page) was forced wider than the viewport instead of the editor
    // clipping/scrolling internally.
    <div className="section-editor flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="text-xs text-slate-500">Placeholders (click to copy, then paste into the document):</span>
        {placeholders.map((p) => (
          <button
            key={p}
            type="button"
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs hover:bg-slate-50"
            onClick={() => copyToken(p)}
          >
            {copiedToken === p ? "Copied!" : `{{${p}}}`}
          </button>
        ))}
      </div>
      <div className="mb-1">{hint}</div>

      {needsMigration && (
        <p className="mb-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          This section was created in the previous editor and hasn&apos;t been
          converted to the new format yet. It will open as a blank document
          here — ask an admin to run the migration, then reload this page.
        </p>
      )}

      {/* `min-h-0` on a flex child overrides its default min-height:auto —
          without it this box refuses to shrink to the 520px below when its
          content (the document) is taller, so nothing inside ever scrolls. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-300" style={{ height: 520 }}>
        <SuperDocEditor
          // Remounts the editor when switching which section is open —
          // SuperDoc loads `document` once at mount, not on every prop change.
          key={isDocxUrl(value) ? value : "new"}
          document={isDocxUrl(value) ? { url: value } : undefined}
          contained
          className="h-full w-full"
          onReady={({ superdoc }) => {
            instanceRef.current = superdoc;
            onReady({
              getDocx: async () => {
                const instance = instanceRef.current;
                if (!instance) throw new Error("Editor is not ready yet");
                return instance.export({ triggerDownload: false });
              },
            });
          }}
        />
      </div>
    </div>
  );
}
