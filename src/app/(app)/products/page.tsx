import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";

export default async function ProductsPage() {
  await requireRole("ADMIN");
  const products = await prisma.product.findMany({
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: { _count: { select: { sections: true } } },
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="Each product owns an ordered set of section templates."
        actions={<LinkButton href="/products/new">New product</LinkButton>}
      />
      {products.length === 0 ? (
        <EmptyState title="No products yet">
          <LinkButton href="/products/new" variant="secondary">
            Create the first product
          </LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <Card className="flex items-center justify-between hover:border-blue-500">
                <div>
                  <div className="font-medium">
                    {p.name}
                    {p.archived && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        archived
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {p.category ?? "Uncategorised"} · {p._count.sections} section
                    {p._count.sections === 1 ? "" : "s"}
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
