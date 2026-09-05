"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { createProposal } from "@/server/proposals";
import { todayISODate, parseDateInput } from "@/lib/date";

export function ProposalCreateForm({
  customers,
  brandProfiles,
}: {
  customers: { id: string; name: string }[];
  brandProfiles: { id: string; name: string; isDefault: boolean }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [brandProfileId, setBrandProfileId] = useState(
    brandProfiles.find((b) => b.isDefault)?.id ?? "",
  );
  const [reference, setReference] = useState("");
  const [proposalDate, setProposalDate] = useState(todayISODate());

  function submit() {
    setError(null);
    start(async () => {
      const res = await createProposal({
        title,
        customerId,
        brandProfileId,
        reference,
        proposalDate: parseDateInput(proposalDate),
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Proposal title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Customer">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Brand profile" hint="Leave blank to use built-in defaults">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={brandProfileId}
          onChange={(e) => setBrandProfileId(e.target.value)}
        >
          <option value="">— none —</option>
          {brandProfiles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date">
          <Input
            type="date"
            value={proposalDate}
            onChange={(e) => setProposalDate(e.target.value)}
          />
        </Field>
        <Field label="Reference">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <Button onClick={submit} disabled={pending || !title.trim() || !customerId}>
          {pending ? "Creating…" : "Create & continue"}
        </Button>
      </div>
    </div>
  );
}
