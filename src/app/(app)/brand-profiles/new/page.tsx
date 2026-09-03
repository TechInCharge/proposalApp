import { requireRole } from "@/lib/rbac";
import { PageHeader, LinkButton } from "@/components/ui";
import { BrandProfileForm } from "@/components/BrandProfileForm";

export default async function NewBrandProfilePage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader
        title="New brand profile"
        actions={
          <LinkButton href="/brand-profiles" variant="secondary">
            Back
          </LinkButton>
        }
      />
      <BrandProfileForm />
    </>
  );
}
