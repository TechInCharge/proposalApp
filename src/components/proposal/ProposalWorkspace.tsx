"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";
import {
  updateProposalDetails,
  setProposalProducts,
  setProposalStatus,
} from "@/server/proposals";
import { parseDateInput } from "@/lib/date";
import { SectionsPanel } from "./SectionsPanel";
import { BoqPanel } from "./BoqPanel";
import { GeneratePanel } from "./GeneratePanel";
import type {
  BoqCatalogOption,
  Option,
  ProposalStatus,
  WorkspaceBoqItem,
  WorkspaceProduct,
  WorkspaceProposal,
  WorkspaceSection,
} from "./types";

const TABS = ["Details", "Products", "Sections", "BoQ", "Generate"] as const;
type Tab = (typeof TABS)[number];

export function ProposalWorkspace(props: {
  proposal: WorkspaceProposal;
  selectedProductIds: string[];
  sections: WorkspaceSection[];
  boqItems: WorkspaceBoqItem[];
  boqCatalog: BoqCatalogOption[];
  customers: Option[];
  brandProfiles: Option[];
  products: WorkspaceProduct[];
}) {
  const [tab, setTab] = useState<Tab>("Details");

  return (
    <div className="grid gap-4">
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t
                ? "border-brand font-medium text-brand-dark"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Details" && (
        <DetailsPanel
          proposal={props.proposal}
          customers={props.customers}
          brandProfiles={props.brandProfiles}
        />
      )}
      {tab === "Products" && (
        <ProductsPanel
          proposalId={props.proposal.id}
          products={props.products}
          selectedIds={props.selectedProductIds}
        />
      )}
      {tab === "Sections" && (
        <SectionsPanel proposalId={props.proposal.id} sections={props.sections} />
      )}
      {tab === "BoQ" && (
        <BoqPanel
          proposalId={props.proposal.id}
          items={props.boqItems}
          catalog={props.boqCatalog}
        />
      )}
      {tab === "Generate" && (
        <GeneratePanel
          proposalId={props.proposal.id}
          generatedAt={props.proposal.generatedAt}
          pdfUrl={props.proposal.pdfUrl}
          docxUrl={props.proposal.docxUrl}
        />
      )}
    </div>
  );
}

function DetailsPanel({
  proposal,
  customers,
  brandProfiles,
}: {
  proposal: WorkspaceProposal;
  customers: Option[];
  brandProfiles: Option[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    title: proposal.title,
    customerId: proposal.customerId,
    brandProfileId: proposal.brandProfileId ?? "",
    proposalDate: proposal.proposalDate,
    reference: proposal.reference,
    contactName: proposal.contactName,
    contactTitle: proposal.contactTitle,
    contactEmail: proposal.contactEmail,
    contactPhone: proposal.contactPhone,
  });
  const set = (patch: Partial<typeof f>) => {
    setF((p) => ({ ...p, ...patch }));
    setSaved(false);
  };

  function save() {
    setError(null);
    start(async () => {
      const res = await updateProposalDetails(proposal.id, {
        ...f,
        proposalDate: parseDateInput(f.proposalDate),
      });
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  function changeStatus(status: ProposalStatus) {
    start(async () => {
      await setProposalStatus(proposal.id, status);
      router.refresh();
    });
  }

  return (
    <Card className="grid max-w-xl gap-4">
      <Field label="Title">
        <Input value={f.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Customer">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={f.customerId}
          onChange={(e) => set({ customerId: e.target.value })}
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Brand profile">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={f.brandProfileId}
          onChange={(e) => set({ brandProfileId: e.target.value })}
        >
          <option value="">— built-in defaults —</option>
          {brandProfiles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date">
          <Input
            type="date"
            value={f.proposalDate}
            onChange={(e) => set({ proposalDate: e.target.value })}
          />
        </Field>
        <Field label="Reference">
          <Input
            value={f.reference}
            onChange={(e) => set({ reference: e.target.value })}
          />
        </Field>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <span className="text-sm font-medium text-slate-700">Contact (optional)</span>
        <p className="mb-2 text-xs text-slate-400">
          Shown as &ldquo;Attn:&rdquo; on the cover page and available as{" "}
          <code>{"{{contact.name}}"}</code> etc. in section text.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input
              value={f.contactName}
              onChange={(e) => set({ contactName: e.target.value })}
            />
          </Field>
          <Field label="Title">
            <Input
              value={f.contactTitle}
              onChange={(e) => set({ contactTitle: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              value={f.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={f.contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !f.title.trim()}>
          {pending ? "Saving…" : "Save details"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>

      <div className="border-t border-slate-200 pt-3">
        <span className="mr-2 text-sm text-slate-500">Status:</span>
        {(["DRAFT", "IN_REVIEW", "FINAL"] as ProposalStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            className={`mr-1 rounded px-2 py-1 text-xs ${
              proposal.status === s
                ? "bg-slate-800 text-white"
                : "bg-slate-100 hover:bg-slate-200"
            }`}
          >
            {s.toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>
    </Card>
  );
}

function ProductsPanel({
  proposalId,
  products,
  selectedIds,
}: {
  proposalId: string;
  products: WorkspaceProduct[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(selectedIds);

  function apply(next: string[]) {
    setSelected(next);
    start(async () => {
      await setProposalProducts(proposalId, next);
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No active products. An admin needs to create products with section
        templates first.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-slate-500">
        Selecting a product copies its section templates into this proposal.
        Removing one deletes its sections here (including edits).
      </p>
      {products.map((p) => {
        const checked = selected.includes(p.id);
        return (
          <label
            key={p.id}
            className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={pending}
              onChange={(e) =>
                apply(
                  e.target.checked
                    ? [...selected, p.id]
                    : selected.filter((id) => id !== p.id),
                )
              }
            />
            <span className="font-medium">{p.name}</span>
            <span className="text-sm text-slate-500">
              {p.category ?? "Uncategorised"} · {p.sectionCount} section
              {p.sectionCount === 1 ? "" : "s"}
            </span>
          </label>
        );
      })}
    </div>
  );
}
