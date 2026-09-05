"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { saveBoq, parseBoqUpload } from "@/server/proposals";
import type { BoqCatalogOption, WorkspaceBoqItem } from "./types";

const EMPTY: WorkspaceBoqItem = {
  partNumber: "",
  description: "",
  quantity: 1,
};

export function BoqPanel({
  proposalId,
  items,
  catalog,
}: {
  proposalId: string;
  items: WorkspaceBoqItem[];
  catalog: BoqCatalogOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<WorkspaceBoqItem[]>(items);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(i: number, patch: Partial<WorkspaceBoqItem>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
    setSaved(false);
  }

  function addRows(incoming: WorkspaceBoqItem[]) {
    setRows((r) => [...r, ...incoming]);
    setSaved(false);
  }

  function importFile(file: File) {
    setImportError(null);
    setNotice(null);
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await parseBoqUpload(fd);
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      const incoming = res.rows as WorkspaceBoqItem[];
      addRows(incoming);
      setNotice(
        `Added ${incoming.length} row${incoming.length === 1 ? "" : "s"}` +
          (res.skipped ? `, skipped ${res.skipped}` : "") +
          ". Review, then Save BoQ.",
      );
    });
  }

  function save() {
    start(async () => {
      const res = await saveBoq(
        proposalId,
        rows.filter((r) => r.description.trim()),
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-1">Part No.</th>
              <th className="p-1">Description</th>
              <th className="p-1 w-20">Qty</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="p-1">
                  <Input value={r.partNumber} onChange={(e) => set(i, { partNumber: e.target.value })} />
                </td>
                <td className="p-1">
                  <Input value={r.description} onChange={(e) => set(i, { description: e.target.value })} />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={r.quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => set(i, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="p-1">
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => {
                      setRows((rs) => rs.filter((_, idx) => idx !== i));
                      setSaved(false);
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LibraryPicker
        catalog={catalog}
        onPick={(item) =>
          addRows([{ partNumber: item.partNumber, description: item.description, quantity: 1 }])
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => addRows([{ ...EMPTY }])}>
          Add blank row
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          Import .xlsx / .csv
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = "";
          }}
        />
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save BoQ"}
        </Button>
        {saved && <span className="self-center text-sm text-green-600">Saved</span>}
      </div>
      {notice && <p className="text-sm text-slate-600">{notice}</p>}
      {importError && <p className="text-sm text-red-600">{importError}</p>}
      <p className="text-xs text-slate-400">
        Saving the BoQ also adds its items to the shared library, so you can pick
        them from &ldquo;Add from library&rdquo; next time. Import expects a
        header row with a <strong>Description</strong> column; Part No. and Qty
        are matched by common aliases.
      </p>
    </div>
  );
}

function LibraryPicker({
  catalog,
  onPick,
}: {
  catalog: BoqCatalogOption[];
  onPick: (item: BoqCatalogOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? catalog.filter(
          (c) =>
            c.description.toLowerCase().includes(q) ||
            c.partNumber.toLowerCase().includes(q),
        )
      : catalog;
    return base.slice(0, 50);
  }, [catalog, query]);

  if (catalog.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        The BoQ library is empty. Save this proposal&rsquo;s BoQ to start it, or
        an admin can add items under <strong>BoQ Library</strong>.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <button
        type="button"
        className="text-sm font-medium text-brand-dark"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} Add from library ({catalog.length})
      </button>
      {open && (
        <div className="mt-2 grid gap-2">
          <Input
            autoFocus
            placeholder="Search part number or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="max-h-64 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200 bg-white">
            {filtered.length === 0 && (
              <li className="p-2 text-sm text-slate-400">No matches.</li>
            )}
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 p-2 text-sm"
              >
                <span className="min-w-0">
                  {c.partNumber && (
                    <span className="mr-2 rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
                      {c.partNumber}
                    </span>
                  )}
                  <span className="text-slate-800">{c.description}</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded bg-brand-light px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand hover:text-white"
                  onClick={() => onPick(c)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
