"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OnlyOfficeDocKind } from "@/lib/onlyoffice/constants";

export interface OnlyOfficeEditorHandle {
  /** Force-saves the live document and waits for it to actually persist; resolves with the new storage URL. */
  save(): Promise<{ bodyUrl: string | null }>;
}

interface DocEditorInstance {
  destroyEditor: () => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: unknown) => DocEditorInstance;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadDocsApiScript(serverUrl: string): Promise<void> {
  if (typeof window !== "undefined" && window.DocsAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${serverUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the OnlyOffice editor script"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Low-level OnlyOffice Document Server wrapper: fetches a signed editor
 * config for one row, mounts `DocsAPI.DocEditor`, and hands back a handle
 * whose `save()` drives the server-side forcesave+callback round trip (see
 * /api/onlyoffice/force-save). There's no per-keystroke onChange — same
 * on-demand-save contract the old SuperDoc editor used.
 */
export function OnlyOfficeEditor({
  kind,
  id,
  onReady,
}: {
  kind: OnlyOfficeDocKind;
  id: string;
  onReady: (handle: OnlyOfficeEditorHandle) => void;
}) {
  const containerId = `onlyoffice-${useId()}`;
  const editorRef = useRef<DocEditorInstance | null>(null);
  const keyRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serverUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;

  useEffect(() => {
    if (!serverUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/onlyoffice/config?kind=${kind}&id=${id}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Failed to load the editor");
          return;
        }
        await loadDocsApiScript(serverUrl);
        if (cancelled || !window.DocsAPI) return;

        keyRef.current = json.key;
        editorRef.current = new window.DocsAPI.DocEditor(containerId, json.config);
        onReady({
          save: async () => {
            if (!keyRef.current) throw new Error("Editor is not ready yet");
            const r = await fetch("/api/onlyoffice/force-save", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ kind, id, key: keyRef.current }),
            });
            const j = await r.json();
            if (!r.ok || !j.ok) throw new Error(j.error ?? "Save failed");
            return { bodyUrl: j.bodyUrl ?? null };
          },
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the editor");
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  const shownError = error ?? (!serverUrl ? "NEXT_PUBLIC_ONLYOFFICE_URL is not configured" : null);
  if (shownError) {
    return (
      <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{shownError}</p>
    );
  }

  return <div id={containerId} className="h-full w-full" />;
}
