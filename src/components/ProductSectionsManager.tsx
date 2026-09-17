"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { SectionEditor } from "@/components/SectionEditor";
import type { SectionEditorHandle } from "@/components/SectionEditorImpl";
import {
  saveSectionTemplate,
  deleteSectionTemplate,
  reorderSectionTemplates,
} from "@/server/products";

type Section = { id: string; title: string; order: number; body: unknown };

export function ProductSectionsManager({
  productId,
  sections,
}: {
  productId: string;
  sections: Section[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const editorHandleRef = useRef<SectionEditorHandle | null>(null);

  function openNew() {
    setEditingId("new");
    setDraftTitle("");
    setDraftBody(null);
    setError(null);
  }

  function openEdit(s: Section) {
    setEditingId(s.id);
    setDraftTitle(s.title);
    setDraftBody(s.body ?? null);
    setError(null);
  }

  function save() {
    setError(null);
    start(async () => {
      const handle = editorHandleRef.current;
      if (!handle) {
        setError("Editor is not ready yet");
        return;
      }

      let bodyUrl: string;
      try {
        const docx = await handle.getDocx();
        const uploadRes = await fetch("/api/editor/section-body", { method: "POST", body: docx });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");
        bodyUrl = uploadJson.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save document");
        return;
      }

      const res = await saveSectionTemplate(
        editingId === "new" ? null : editingId,
        {
          productId,
          title: draftTitle,
          order: editingId === "new" ? sections.length : 0,
          body: bodyUrl,
        },
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this section template?")) return;
    start(async () => {
      await deleteSectionTemplate(id);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    start(async () => {
      await reorderSectionTemplates(
        productId,
        next.map((s) => s.id),
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Section templates</h2>
        <Button variant="secondary" onClick={openNew} disabled={editingId === "new"}>
          Add section
        </Button>
      </div>

      {sections.length === 0 && editingId !== "new" && (
        <p className="text-sm text-slate-500">No sections yet.</p>
      )}

      {sections.map((s, i) => (
        <Card key={s.id} className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {i + 1}. {s.title}
            </div>
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
              <Button variant="danger" onClick={() => remove(s.id)} disabled={pending}>
                Delete
              </Button>
            </div>
          </div>

          {editingId === s.id && (
            <Editor
              title={draftTitle}
              body={draftBody}
              onTitle={setDraftTitle}
              onEditorReady={(h) => (editorHandleRef.current = h)}
              onSave={save}
              onCancel={() => setEditingId(null)}
              pending={pending}
              error={error}
            />
          )}
        </Card>
      ))}

      {editingId === "new" && (
        <Card>
          <Editor
            title={draftTitle}
            body={draftBody}
            onTitle={setDraftTitle}
            onEditorReady={(h) => (editorHandleRef.current = h)}
            onSave={save}
            onCancel={() => setEditingId(null)}
            pending={pending}
            error={error}
          />
        </Card>
      )}
    </div>
  );
}

function Editor({
  title,
  body,
  onTitle,
  onEditorReady,
  onSave,
  onCancel,
  pending,
  error,
}: {
  title: string;
  body: unknown;
  onTitle: (v: string) => void;
  onEditorReady: (handle: SectionEditorHandle) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Input
        placeholder="Section title"
        value={title}
        onChange={(e) => onTitle(e.target.value)}
      />
      <SectionEditor value={body} onReady={onEditorReady} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={pending || !title.trim()}>
          {pending ? "Saving…" : "Save section"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
