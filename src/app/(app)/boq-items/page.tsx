import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { BoqCatalogManager } from "@/components/BoqCatalogManager";

export default async function BoqItemsPage() {
  await requireRole("ADMIN");
  const items = await prisma.boqCatalogItem.findMany({
    orderBy: [{ description: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="BoQ Library"
        description="Reusable Bill of Quantities items. Proposals pick from these; editing here does not change proposals that already used an item."
      />
      <BoqCatalogManager
        items={items.map((i) => ({
          id: i.id,
          partNumber: i.partNumber,
          description: i.description,
        }))}
      />
    </>
  );
}
