"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { duplicateProposal, deleteProposal } from "@/server/proposals";

export function ProposalActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateProposal(proposalId);
            if (res.ok) router.push(`/proposals/${res.id}/edit`);
          })
        }
      >
        Duplicate
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this proposal? This cannot be undone.")) return;
          start(async () => {
            await deleteProposal(proposalId);
          });
        }}
      >
        Delete
      </Button>
    </>
  );
}
