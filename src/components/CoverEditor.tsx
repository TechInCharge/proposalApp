"use client";

import { SectionEditor } from "@/components/SectionEditor";
import {
  COVER_PLACEHOLDERS,
  DEFAULT_COVER_TEMPLATE,
} from "@/lib/render/cover-constants";

/**
 * Rich editor for a custom cover page. Empty value = fall back to the
 * auto-generated cover. Used on the Brand Profile form and (as a per-proposal
 * override) on the proposal Details tab.
 */
export function CoverEditor({
  value,
  onChange,
  fallbackNote,
}: {
  value: string;
  onChange: (html: string) => void;
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
          onClick={() => onChange(DEFAULT_COVER_TEMPLATE)}
        >
          Load default layout
        </button>
        {hasCustom && (
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
            onClick={() => onChange("")}
          >
            Clear (use auto cover)
          </button>
        )}
      </div>

      <SectionEditor
        value={value}
        onChange={onChange}
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
