import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card } from "@/components/ui";
import { ProductForm } from "@/components/ProductForm";
import { ProductSectionsManager } from "@/components/ProductSectionsManager";
import { ArchiveToggle } from "@/components/ArchiveToggle";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.category ?? undefined}
        actions={
          <>
            <ArchiveToggle id={product.id} archived={product.archived} />
            <LinkButton href="/products" variant="secondary">
              Back
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Details</h2>
          <ProductForm
            product={{
              id: product.id,
              name: product.name,
              category: product.category,
              description: product.description,
              tags: product.tags,
            }}
          />
        </Card>

        <ProductSectionsManager
          productId={product.id}
          sections={product.sections.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            body: s.body,
          }))}
        />
      </div>
    </>
  );
}
