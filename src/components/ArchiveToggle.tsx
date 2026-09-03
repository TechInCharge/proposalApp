"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { setProductArchived } from "@/server/products";

export function ArchiveToggle({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setProductArchived(id, !archived);
          router.refresh();
        })
      }
    >
      {archived ? "Unarchive" : "Archive"}
    </Button>
  );
}
