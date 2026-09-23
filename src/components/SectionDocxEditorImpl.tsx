"use client";

import { useState } from "react";
import { OnlyOfficeEditor, type OnlyOfficeEditorHandle } from "@/components/OnlyOfficeEditor";
import type { OnlyOfficeDocKind } from "@/lib/onlyoffice/constants";

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

export interface SectionDocxEditorHandle {
  /** Saves the live document; resolves once it's actually persisted, with its new storage URL. */
  save(): Promise<{ bodyUrl: string | null }>;
}

/**
 * Section/proposal-section editor, built on OnlyOffice's Document Server
 * (see OnlyOfficeEditor) — replaces the SuperDoc-based SectionEditorImpl for
 * these two row kinds. Unlike the old editor, this one needs the row's real
 * identity (`kind`+`id`) up front, not just a content value, since saving
 * goes through a server-side forcesave+callback round trip keyed by that
 * identity — callers must ensure the row already exists (see
 * ProductSectionsManager's draft-row creation for "new" sections).
 */
export function SectionDocxEditorImpl({
  kind,
  id,
  onReady,
  placeholders = DEFAULT_PLACEHOLDERS,
  hint = DEFAULT_HINT,
}: {
  kind: OnlyOfficeDocKind;
  id: string;
  onReady: (handle: SectionDocxEditorHandle) => void;
  placeholders?: string[];
  hint?: React.ReactNode;
}) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function copyToken(token: string) {
    const text = `{{${token}}}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1200);
  }

  function handleReady(handle: OnlyOfficeEditorHandle) {
    onReady({ save: () => handle.save() });
  }

  return (
    // min-w-0/min-h-0: same grid/flex shrink gotcha as the old editor — see
    // ui.tsx's Card comment. OnlyOffice's own iframe is just as intrinsically
    // wide as SuperDoc's canvas was.
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

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-300" style={{ height: 520 }}>
        <OnlyOfficeEditor kind={kind} id={id} onReady={handleReady} />
      </div>
    </div>
  );
}
