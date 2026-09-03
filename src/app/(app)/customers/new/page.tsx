import { requireUser } from "@/lib/rbac";
import { PageHeader, LinkButton } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";

export default async function NewCustomerPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="New customer"
        actions={
          <LinkButton href="/customers" variant="secondary">
            Back
          </LinkButton>
        }
      />
      <CustomerForm />
    </>
  );
}
