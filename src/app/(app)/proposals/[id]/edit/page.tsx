import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton } from "@/components/ui";
import { ProposalWorkspace } from "@/components/proposal/ProposalWorkspace";
import { ProposalActions } from "@/components/proposal/ProposalActions";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [proposal, customers, brandProfiles, products, boqCatalog] =
    await Promise.all([
      prisma.proposal.findUnique({
        where: { id },
        include: {
          customer: true,
          products: true,
          sections: { orderBy: { order: "asc" } },
          boqItems: { orderBy: { order: "asc" } },
        },
      }),
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.brandProfile.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({
        where: { archived: false },
        orderBy: { name: "asc" },
        include: { _count: { select: { sections: true } } },
      }),
      prisma.boqCatalogItem.findMany({
        orderBy: { description: "asc" },
        take: 500,
      }),
    ]);

  if (!proposal) notFound();

  return (
    <>
      <PageHeader
        title={proposal.title}
        description={`${proposal.customer.name} · ${proposal.status
          .toLowerCase()
          .replace("_", " ")}`}
        actions={
          <>
            <ProposalActions proposalId={proposal.id} />
            <LinkButton href="/proposals" variant="secondary">
              Back
            </LinkButton>
          </>
        }
      />
      <ProposalWorkspace
        proposal={{
          id: proposal.id,
          title: proposal.title,
          customerId: proposal.customerId,
          brandProfileId: proposal.brandProfileId,
          proposalDate: proposal.proposalDate.toISOString().slice(0, 10),
          reference: proposal.reference ?? "",
          contactName: proposal.contactName ?? "",
          contactTitle: proposal.contactTitle ?? "",
          contactEmail: proposal.contactEmail ?? "",
          contactPhone: proposal.contactPhone ?? "",
          coverTemplate:
            typeof proposal.coverTemplate === "string" ? proposal.coverTemplate : "",
          status: proposal.status,
          generatedAt: proposal.generatedAt?.toISOString() ?? null,
          pdfUrl: proposal.pdfUrl,
          docxUrl: proposal.docxUrl,
        }}
        selectedProductIds={proposal.products.map((p) => p.productId)}
        sections={proposal.sections.map((s) => ({
          id: s.id,
          title: s.title,
          order: s.order,
          body: s.body,
          included: s.included,
          edited: s.edited,
        }))}
        boqItems={proposal.boqItems.map((b) => ({
          partNumber: b.partNumber ?? "",
          description: b.description,
          quantity: b.quantity,
        }))}
        boqCatalog={boqCatalog.map((c) => ({
          id: c.id,
          partNumber: c.partNumber,
          description: c.description,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        brandProfiles={brandProfiles.map((b) => ({
          id: b.id,
          name: b.name,
          isDefault: b.isDefault,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sectionCount: p._count.sections,
        }))}
      />
    </>
  );
}
