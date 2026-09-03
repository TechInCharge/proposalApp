import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";

export default async function CustomersPage() {
  await requireUser();
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { proposals: true } } },
  });

  return (
    <>
      <PageHeader
        title="Customers"
        actions={<LinkButton href="/customers/new">New customer</LinkButton>}
      />
      {customers.length === 0 ? (
        <EmptyState title="No customers yet">
          <LinkButton href="/customers/new" variant="secondary">
            Add the first customer
          </LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="flex items-center gap-3 hover:border-blue-500">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logoUrl}
                    alt=""
                    className="h-10 w-10 rounded border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 rounded border border-dashed border-slate-300" />
                )}
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-slate-500">
                    {c._count.proposals} proposal
                    {c._count.proposals === 1 ? "" : "s"}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
