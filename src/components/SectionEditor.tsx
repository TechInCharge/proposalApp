"use client";

import dynamic from "next/dynamic";

/**
 * SuperDoc touches `window` at module load, so the real editor lives in
 * SectionEditorImpl and is loaded client-only. `value` is a
 * `/api/files/section-bodies/<uuid>.docx` URL (or null/empty for a new,
 * blank section) — never HTML. There's no `onChange`: SuperDoc is edited
 * in-browser and only exports on demand, so callers pass `onReady` and pull
 * docx bytes from the returned handle's `getDocx()` when the user saves.
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
