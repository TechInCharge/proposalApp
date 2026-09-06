"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { deleteProduct } from "@/server/products";

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "Delete this component? Its section templates are deleted too. This cannot be undone.",
            )
          )
            return;
          setError(null);
          start(async () => {
            const res = await deleteProduct(id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push("/products");
          });
        }}
      >
        Delete
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
