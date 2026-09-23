"use client";

import { useEffect, useRef, useState } from "react";
import type { OnlyOfficeDocKind } from "@/lib/onlyoffice/constants";

export interface OnlyOfficeEditorHandle {
  /** Force-saves the live document and waits for it to actually persist; resolves with the new storage URL. */
  save(): Promise<{ bodyUrl: string | null }>;
}

/**
 * Low-level OnlyOffice Document Server wrapper. Opens the editor in a real
 * new browser window rather than an embedded iframe — unlike the earlier
 * SuperDoc popup attempt (see the SuperDoc migration plan notes), this is
 * safe: DocsAPI is a plain script with no React involved in its mount
 * target, so there's no cross-realm `instanceof` failure from portaling
 * React-rendered nodes into another window's realm. The popup loads its own
 * copy of the api.js script and calls `DocsAPI.DocEditor` entirely within
 * its own JS realm.
 *
 * `window.open()` must be called synchronously inside the click handler (not
 * after an await) or popup blockers reliably block it — so this renders a
 * button rather than auto-opening on mount.
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
  const popupRef = useRef<Window | null>(null);
  const keyRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const serverUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;

  useEffect(() => {
    return () => {
      popupRef.current?.close();
      popupRef.current = null;
    };
  }, []);

  async function openEditor() {
    setError(null);
    if (!serverUrl) {
      setError("NEXT_PUBLIC_ONLYOFFICE_URL is not configured");
      return;
    }

    const popup = window.open("", "onlyoffice-editor", "width=1280,height=900");
    if (!popup) {
      setError("Popup blocked — allow popups for this site and try again.");
      return;
    }
    popupRef.current = popup;
    popup.document.title = "Loading editor…";
    popup.document.write(
      // DocsAPI.DocEditor doesn't mount *into* #editor-root — it discards
      // that div and inserts its own iframe as a sibling in <body>, so any
      // sizing on the div (including the height:100vh this used to carry)
      // is lost the moment the editor initializes. The iframe itself gets
      // no explicit size from DocsAPI either, so it falls back to the
      // browser's default 150px iframe height — the editor "loads" but
      // only shows a sliver of its top toolbar. Style the iframe directly
      // by tag (this popup only ever holds the one OnlyOffice iframe) so it
      // fills the window regardless of what DocsAPI does to the DOM around it.
      '<!doctype html><html><head><meta charset="utf-8">' +
        "<style>html,body{margin:0;height:100%;width:100%}" +
        "iframe{display:block;width:100vw !important;height:100vh !important;border:0}</style>" +
        '</head><body><div id="editor-root" style="width:100vw;height:100vh"></div></body></html>',
    );
    popup.document.close();

    const closeWatcher = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(closeWatcher);
        if (popupRef.current === popup) {
          popupRef.current = null;
          setOpened(false);
        }
      }
    }, 1000);

    try {
      const res = await fetch(`/api/onlyoffice/config?kind=${kind}&id=${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load the editor");
      if (popup.closed) return;

      await new Promise<void>((resolve, reject) => {
        const script = popup.document.createElement("script");
        script.src = `${serverUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load the OnlyOffice editor script"));
        popup.document.head.appendChild(script);
      });
      if (popup.closed) return;

      const DocsAPI = (popup as unknown as { DocsAPI?: { DocEditor: new (id: string, config: unknown) => unknown } }).DocsAPI;
      if (!DocsAPI) throw new Error("OnlyOffice editor script did not load correctly");

      keyRef.current = json.key;
      new DocsAPI.DocEditor("editor-root", json.config);
      popup.document.title = "Editing…";
      setOpened(true);
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
      setError(e instanceof Error ? e.message : "Failed to open the editor");
      popup.close();
    }
  }

  return (
    <div className="flex h-full min-h-[160px] w-full flex-col items-start justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <button
        type="button"
        onClick={openEditor}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
      >
        {opened ? "Reopen editor window" : "Open editor in a new window"}
      </button>
      {opened && (
        <p className="text-xs text-slate-500">
          Editing in a separate window — switch to it to make changes, then come back here and click Save.
        </p>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
