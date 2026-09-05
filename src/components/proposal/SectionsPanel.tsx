"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { SectionEditor } from "@/components/SectionEditor";
import {
  updateProposalSection,
  reorderProposalSections,
  refreshProposalSections,
} from "@/server/proposals";
import type { WorkspaceSection } from "./types";

export function SectionsPanel({
  proposalId,
  sections,
}: {
  proposalId: string;
  sections: WorkspaceSection[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState<unknown>("");
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  function refresh() {
    setRefreshNote(null);
    start(async () => {
      const res = await refreshProposalSections(proposalId);
      if (!res.ok) {
        setRefreshNote(res.error);
        return;
      }
      const parts = [
        `${res.updated} updated`,
        `${res.added} added`,
        `${res.skippedEdited} kept (edited)`,
      ];
      if (res.orphaned) parts.push(`${res.orphaned} no longer in any template`);
      setRefreshNote(parts.join(", "));
      router.refresh();
    });
  }

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Sections</h2>
      <Button variant="secondary" onClick={refresh} disabled={pending}>
        Refresh from templates
      </Button>
    </div>
  );

  if (sections.length === 0) {
    return (
      <div className="grid gap-3">
        {header}
        <p className="text-sm text-slate-500">
          Select components on the <strong>Components</strong> tab to pull in
          their section templates, then Refresh if templates changed afterwards.
        </p>
        {refreshNote && <p className="text-sm text-slate-600">{refreshNote}</p>}
      </div>
    );
  }

  function toggle(id: string, included: boolean) {
    start(async () => {
      await updateProposalSection(id, { included });
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...sections];
    const t = index + dir;
    if (t < 0 || t >= next.length) return;
    [next[index], next[t]] = [next[t], next[index]];
    start(async () => {
      await reorderProposalSections(
        proposalId,
        next.map((s) => s.id),
      );
      router.refresh();
    });
  }

  function openEdit(s: WorkspaceSection) {
    setEditingId(s.id);
    setDraftTitle(s.title);
    setDraftBody(s.body);
  }

  function save() {
    if (!editingId) return;
    start(async () => {
      await updateProposalSection(editingId, {
        title: draftTitle,
        body: draftBody,
      });
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      {header}
      {refreshNote && <p className="text-sm text-slate-600">{refreshNote}</p>}
      {sections.map((s, i) => (
        <Card key={s.id} className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.included}
                onChange={(e) => toggle(s.id, e.target.checked)}
              />
              <span className={s.included ? "font-medium" : "font-medium text-slate-400 line-through"}>
                {i + 1}. {s.title}
              </span>
              {s.edited && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  edited
                </span>
              )}
            </label>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => move(i, -1)} disabled={pending || i === 0}>
                ↑
              </Button>
              <Button
                variant="ghost"
                onClick={() => move(i, 1)}
                disabled={pending || i === sections.length - 1}
              >
                ↓
              </Button>
              <Button variant="secondary" onClick={() => openEdit(s)}>
                Edit
              </Button>
            </div>
          </div>

          {editingId === s.id && (
            <div className="grid gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <SectionEditor value={draftBody} onChange={setDraftBody} />
              <div className="flex gap-2">
                <Button onClick={save} disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
