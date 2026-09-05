import { requireRole } from "@/lib/rbac";
import { PageHeader, LinkButton } from "@/components/ui";
import { UserForm } from "@/components/UserForm";

export default async function NewUserPage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader
        title="New user"
        actions={
          <LinkButton href="/users" variant="secondary">
            Back
          </LinkButton>
        }
      />
      <UserForm />
    </>
  );
}
