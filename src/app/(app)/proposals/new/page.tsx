import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, EmptyState } from "@/components/ui";
import { ProposalCreateForm } from "@/components/proposal/ProposalCreateForm";

export default async function NewProposalPage() {
  await requireUser();
  const [customers, brandProfiles] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.brandProfile.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="New proposal"
        actions={
          <LinkButton href="/proposals" variant="secondary">
            Back
          </LinkButton>
        }
      />
      {customers.length === 0 ? (
        <EmptyState title="Add a customer first">
          <Link href="/customers/new" className="text-brand underline">
            Create a customer
          </Link>
        </EmptyState>
      ) : (
        <ProposalCreateForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          brandProfiles={brandProfiles.map((b) => ({
            id: b.id,
            name: b.name,
            isDefault: b.isDefault,
          }))}
        />
      )}
    </>
  );
}
