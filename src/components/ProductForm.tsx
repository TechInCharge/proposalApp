"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { saveProduct, createProductAndRedirect } from "@/server/products";

export function ProductForm({
  product,
}: {
  product?: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    tags: string[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [tags, setTags] = useState((product?.tags ?? []).join(", "));

  function submit() {
    setError(null);
    const payload = {
      name,
      category,
      description,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    start(async () => {
      const res = product
        ? await saveProduct(product.id, payload)
        : await createProductAndRedirect(payload);
      if (res && !res.ok) setError(res.error);
      else if (product) router.refresh();
    });
  }

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Category">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Tags" hint="Comma separated">
        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <Button onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "Saving…" : product ? "Save changes" : "Create component"}
        </Button>
      </div>
    </div>
  );
}
