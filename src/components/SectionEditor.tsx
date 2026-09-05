"use client";

import dynamic from "next/dynamic";

/**
 * CKEditor 5 touches `window` at module load, so the real editor lives in
 * SectionEditorImpl and is loaded client-only. The `value`/`onChange` contract
 * is unchanged from the caller's point of view — `value` may be an HTML string
 * (current) or legacy ProseMirror JSON; `onChange` always yields an HTML string.
 */
export const SectionEditor = dynamic(
  () => import("./SectionEditorImpl").then((m) => m.SectionEditorImpl),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-400">
        Loading editor…
      </div>
    ),
  },
);
