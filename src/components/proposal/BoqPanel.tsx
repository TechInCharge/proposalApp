"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { saveBoq } from "@/server/proposals";
import type { WorkspaceBoqItem } from "./types";

const EMPTY: WorkspaceBoqItem = {
  partNumber: "",
  description: "",
  quantity: 1,
  unit: "ea",
  unitPrice: 0,
};

export function BoqPanel({
  proposalId,
  items,
  currency,
  showPricing,
}: {
  proposalId: string;
  items: WorkspaceBoqItem[];
  currency: string;
  showPricing: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<WorkspaceBoqItem[]>(items);
  const [saved, setSaved] = useState(false);

  function set(i: number, patch: Partial<WorkspaceBoqItem>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
    setSaved(false);
  }

  const total = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

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
              <th className="p-1 w-20">Unit</th>
              {showPricing && <th className="p-1 w-28">Unit price</th>}
              {showPricing && <th className="p-1 w-28">Line total</th>}
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
                  <Input value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} />
                </td>
                {showPricing && (
                  <td className="p-1">
                    <Input
                      type="number"
                      value={r.unitPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => set(i, { unitPrice: Number(e.target.value) })}
                    />
                  </td>
                )}
                {showPricing && (
                  <td className="p-1 text-slate-600">{fmt(r.quantity * r.unitPrice)}</td>
                )}
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
          {showPricing && rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="p-1 text-right font-semibold">
                  Grand total
                </td>
                <td className="p-1 font-semibold">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setRows((r) => [...r, { ...EMPTY }])}>
          Add row
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save BoQ"}
        </Button>
        {saved && <span className="self-center text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
