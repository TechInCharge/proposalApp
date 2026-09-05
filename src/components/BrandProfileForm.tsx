"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { CoverEditor } from "@/components/CoverEditor";
import {
  saveBrandProfile,
  createBrandProfileAndRedirect,
} from "@/server/brandProfiles";

type Profile = {
  id: string;
  name: string;
  isDefault: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  coverLayout: string;
  coverTemplate: string;
  headerText: string | null;
  footerText: string | null;
  showPageNumbers: boolean;
};

export function BrandProfileForm({ profile }: { profile?: Profile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: profile?.name ?? "",
    isDefault: profile?.isDefault ?? false,
    primaryColor: profile?.primaryColor ?? "#5636CE",
    secondaryColor: profile?.secondaryColor ?? "#1F2024",
    fontFamily: profile?.fontFamily ?? "Inter",
    coverLayout: (profile?.coverLayout ?? "standard") as
      | "standard"
      | "minimal"
      | "full-bleed",
    coverTemplate: profile?.coverTemplate ?? "",
    headerText: profile?.headerText ?? "",
    footerText: profile?.footerText ?? "",
    showPageNumbers: profile?.showPageNumbers ?? true,
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  function submit() {
    setError(null);
    start(async () => {
      const res = profile
        ? await saveBrandProfile(profile.id, f)
        : await createBrandProfileAndRedirect(f);
      if (res && !res.ok) setError(res.error);
      else if (profile) router.refresh();
    });
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Name">
        <Input value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primary colour">
          <input
            type="color"
            value={f.primaryColor}
            onChange={(e) => set({ primaryColor: e.target.value })}
            className="h-9 w-full rounded border border-slate-300"
          />
        </Field>
        <Field label="Secondary colour">
          <input
            type="color"
            value={f.secondaryColor}
            onChange={(e) => set({ secondaryColor: e.target.value })}
            className="h-9 w-full rounded border border-slate-300"
          />
        </Field>
      </div>
      <Field label="Font family">
        <Input
          value={f.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value })}
        />
      </Field>
      <Field label="Cover layout">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={f.coverLayout}
          onChange={(e) =>
            set({ coverLayout: e.target.value as typeof f.coverLayout })
          }
        >
          <option value="standard">Standard</option>
          <option value="minimal">Minimal</option>
          <option value="full-bleed">Full bleed</option>
        </select>
      </Field>
      <div className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Cover page</span>
        <span className="text-xs text-slate-400">
          Design the cover freely with text, colours, images and layout. Leave
          empty to use the built-in cover. Renders in both PDF and DOCX.
        </span>
        <CoverEditor
          value={f.coverTemplate}
          onChange={(html) => set({ coverTemplate: html })}
          fallbackNote="Empty — the built-in auto cover is used"
        />
      </div>

      <Field label="Header text">
        <Input
          value={f.headerText}
          onChange={(e) => set({ headerText: e.target.value })}
        />
      </Field>
      <Field label="Footer text">
        <Input
          value={f.footerText}
          onChange={(e) => set({ footerText: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.showPageNumbers}
          onChange={(e) => set({ showPageNumbers: e.target.checked })}
        />
        Show page numbers
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.isDefault}
          onChange={(e) => set({ isDefault: e.target.checked })}
        />
        Use as default for new proposals
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <Button onClick={submit} disabled={pending || !f.name.trim()}>
          {pending ? "Saving…" : profile ? "Save changes" : "Create profile"}
        </Button>
      </div>
    </div>
  );
}
