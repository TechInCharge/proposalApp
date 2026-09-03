import { requireRole } from "@/lib/rbac";
import { PageHeader, LinkButton } from "@/components/ui";
import { ProductForm } from "@/components/ProductForm";

export default async function NewProductPage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader
        title="New product"
        actions={
          <LinkButton href="/products" variant="secondary">
            Back
          </LinkButton>
        }
      />
      <ProductForm />
    </>
  );
}
