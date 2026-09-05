import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card } from "@/components/ui";
import { UserForm } from "@/components/UserForm";
import { DeleteUserButton } from "@/components/DeleteUserButton";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) notFound();

  const isSelf = session.user.id === user.id;

  return (
    <>
      <PageHeader
        title={user.name || user.email}
        description={user.email}
        actions={
          <>
            {!isSelf && <DeleteUserButton id={user.id} />}
            <LinkButton href="/users" variant="secondary">
              Back
            </LinkButton>
          </>
        }
      />
      <Card>
        <UserForm user={user} />
        {isSelf && (
          <p className="mt-3 text-xs text-slate-400">
            This is your own account — role changes still apply, but you can&apos;t
            delete it here.
          </p>
        )}
      </Card>
    </>
  );
}
