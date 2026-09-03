import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  FINAL: "bg-green-100 text-green-700",
};

export default async function ProposalsPage() {
  await requireUser();
  const proposals = await prisma.proposal.findMany({
    orderBy: { updatedAt: "desc" },
    include: { customer: true, _count: { select: { sections: true } } },
  });

  return (
    <>
      <PageHeader
        title="Proposals"
        actions={<LinkButton href="/proposals/new">New proposal</LinkButton>}
      />
      {proposals.length === 0 ? (
        <EmptyState title="No proposals yet">
          <LinkButton href="/proposals/new" variant="secondary">
            Create the first proposal
          </LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}/edit`}>
              <Card className="flex items-center justify-between hover:border-blue-500">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm text-slate-500">
                    {p.customer.name} · {p._count.sections} section
                    {p._count.sections === 1 ? "" : "s"}
                    {p.generatedAt
                      ? ` · generated ${p.generatedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[p.status]}`}
                >
                  {p.status.toLowerCase().replace("_", " ")}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
