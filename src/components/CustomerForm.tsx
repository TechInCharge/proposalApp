"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { saveCustomer, createCustomerAndRedirect } from "@/server/customers";

type Contact = { name: string; title?: string; email?: string; phone?: string };

export function CustomerForm({
  customer,
}: {
  customer?: {
    id: string;
    name: string;
    website: string | null;
    contacts: Contact[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(customer?.name ?? "");
  const [website, setWebsite] = useState(customer?.website ?? "");
  const [contacts, setContacts] = useState<Contact[]>(customer?.contacts ?? []);

  function setContact(i: number, patch: Partial<Contact>) {
    setContacts((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function submit() {
    setError(null);
    const payload = {
      name,
      website,
      contacts: contacts.filter((c) => c.name.trim()),
    };
    start(async () => {
      const res = customer
        ? await saveCustomer(customer.id, payload)
        : await createCustomerAndRedirect(payload);
      if (res && !res.ok) setError(res.error);
      else if (customer) router.refresh();
    });
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Company name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Website" hint="Include https://">
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
      </Field>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Contacts</span>
          <Button
            variant="secondary"
            onClick={() => setContacts((c) => [...c, { name: "" }])}
          >
            Add contact
          </Button>
        </div>
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2">
            <Input
              placeholder="Name"
              value={c.name}
              onChange={(e) => setContact(i, { name: e.target.value })}
            />
            <Input
              placeholder="Title"
              value={c.title ?? ""}
              onChange={(e) => setContact(i, { title: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={c.email ?? ""}
              onChange={(e) => setContact(i, { email: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={c.phone ?? ""}
              onChange={(e) => setContact(i, { phone: e.target.value })}
            />
            <button
              type="button"
              className="col-span-2 justify-self-start text-xs text-red-600"
              onClick={() => setContacts((cs) => cs.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <Button onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "Saving…" : customer ? "Save changes" : "Create customer"}
        </Button>
      </div>
    </div>
  );
}
