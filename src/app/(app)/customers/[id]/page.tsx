import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";
import { LogoUpload } from "@/components/LogoUpload";

type Contact = { name: string; title?: string; email?: string; phone?: string };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        actions={
          <LinkButton href="/customers" variant="secondary">
            Back
          </LinkButton>
        }
      />
      <div className="grid gap-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Logo</h2>
          <LogoUpload customerId={customer.id} logoUrl={customer.logoUrl} />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Details</h2>
          <CustomerForm
            customer={{
              id: customer.id,
              name: customer.name,
              website: customer.website,
              contacts: (customer.contacts as Contact[]) ?? [],
            }}
          />
        </Card>
      </div>
    </>
  );
}
