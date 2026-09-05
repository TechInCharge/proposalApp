"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import {
  createBoqCatalogItem,
  updateBoqCatalogItem,
  deleteBoqCatalogItem,
} from "@/server/boqCatalog";

type Item = { id: string; partNumber: string; description: string };

export function BoqCatalogManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [newPart, setNewPart] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editPart, setEditPart] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.description.toLowerCase().includes(q) ||
        i.partNumber.toLowerCase().includes(q),
    );
  }, [items, query]);

  function add() {
    setError(null);
    start(async () => {
      const res = await createBoqCatalogItem({
        partNumber: newPart,
        description: newDesc,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewPart("");
      setNewDesc("");
      router.refresh();
    });
  }

  function saveEdit() {
    if (!editId) return;
    setError(null);
    start(async () => {
      const res = await updateBoqCatalogItem(editId, {
        partNumber: editPart,
        description: editDesc,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditId(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this item from the library?")) return;
    start(async () => {
      await deleteBoqCatalogItem(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Add an item</span>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs text-slate-500">
            Part No. (optional)
            <Input
              value={newPart}
              onChange={(e) => setNewPart(e.target.value)}
              className="w-40"
            />
          </label>
          <label className="grid flex-1 gap-1 text-xs text-slate-500">
            Description
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDesc.trim()) add();
              }}
            />
          </label>
          <Button onClick={add} disabled={pending || !newDesc.trim()}>
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Input
        placeholder="Search the library…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {items.length === 0
            ? "The library is empty. Add items above, or save a proposal's BoQ."
            : "No items match your search."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">Part No.</th>
                <th className="p-2">Description</th>
                <th className="p-2 w-40" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) =>
                editId === i.id ? (
                  <tr key={i.id} className="border-t border-slate-200">
                    <td className="p-2">
                      <Input
                        value={editPart}
                        onChange={(e) => setEditPart(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button onClick={saveEdit} disabled={pending || !editDesc.trim()}>
                          Save
                        </Button>
                        <Button variant="ghost" onClick={() => setEditId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i.id} className="border-t border-slate-200">
                    <td className="p-2 font-mono text-xs text-slate-600">
                      {i.partNumber || "—"}
                    </td>
                    <td className="p-2">{i.description}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditId(i.id);
                            setEditPart(i.partNumber);
                            setEditDesc(i.description);
                            setError(null);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => remove(i.id)}
                          disabled={pending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
