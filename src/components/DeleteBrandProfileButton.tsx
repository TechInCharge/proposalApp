"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { deleteBrandProfile } from "@/server/brandProfiles";

export function DeleteBrandProfileButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this brand profile?")) return;
        start(async () => {
          await deleteBrandProfile(id);
          router.push("/brand-profiles");
        });
      }}
    >
      Delete
    </Button>
  );
}
