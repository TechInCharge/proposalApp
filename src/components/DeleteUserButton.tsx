"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { deleteUser } from "@/server/users";

export function DeleteUserButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this user? This cannot be undone.")) return;
          setError(null);
          start(async () => {
            const res = await deleteUser(id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push("/users");
          });
        }}
      >
        Delete
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
