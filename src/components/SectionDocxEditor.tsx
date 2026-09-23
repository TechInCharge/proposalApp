"use client";

import dynamic from "next/dynamic";

/**
 * OnlyOffice touches `window` at module load, so the real editor lives in
 * SectionDocxEditorImpl and is loaded client-only — same reason the old
 * SuperDoc-based SectionEditor did this. `kind`+`id` identify an existing
 * SectionTemplate/ProposalSection row (see ProductSectionsManager's
 * draft-row creation for brand-new sections — the row must exist before
 * this mounts). There's no `onChange`: callers pass `onReady` and call the
 * returned handle's `save()` when the user clicks their own Save button.
 */
export const SectionDocxEditor = dynamic(
  () => import("./SectionDocxEditorImpl").then((m) => m.SectionDocxEditorImpl),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-400">
        Loading editor…
      </div>
    ),
  },
);
