"use client";

import { SectionEditor } from "@/components/SectionEditor";
import type { SectionEditorHandle } from "@/components/SectionEditorImpl";
import {
  COVER_PLACEHOLDERS,
  DEFAULT_COVER_TEMPLATE_URL,
} from "@/lib/render/cover-constants";

/**
 * Editor for a custom cover page, built on the same SuperDoc editor as
 * section templates. Empty value = fall back to the auto-generated cover.
 * Used on the Brand Profile form and (as a per-proposal override) on the
 * proposal Details tab.
 *
 * `value` is a `/api/files/...docx` URL (or "" for "use the auto cover").
 * There's no `onChange` — like SectionEditor, the editor exports on demand
 * via the handle returned through `onReady`; the caller's own Save button
 * pulls docx bytes from it at submit time.
 */
export function CoverEditor({
  value,
  onReady,
  onLoadDefault,
  onClear,
  fallbackNote,
}: {
  value: string;
  onReady: (handle: SectionEditorHandle) => void;
  /** Switches the editor to load the built-in default layout (remounts it). */
  onLoadDefault: () => void;
  /** Clears back to "use the auto cover" (remounts to a blank editor). */
  onClear: () => void;
  fallbackNote: string;
}) {
  const hasCustom = value.trim().length > 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{hasCustom ? "Custom cover" : fallbackNote}</span>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
          onClick={onLoadDefault}
        >
          Load default layout
        </button>
        {hasCustom && (
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
            onClick={onClear}
          >
            Clear (use auto cover)
          </button>
        )}
      </div>

      <SectionEditor
        value={value}
        onReady={onReady}
        placeholders={[...COVER_PLACEHOLDERS]}
        hint={
          <span className="text-xs text-slate-400">
            {"{{customer.logo}}"} and {"{{brand.logo}}"} drop in the logos; other
            tokens fill in proposal &amp; customer details.
          </span>
        }
      />
    </div>
  );
}

export { DEFAULT_COVER_TEMPLATE_URL };
