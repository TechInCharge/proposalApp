import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card } from "@/components/ui";

export default async function UsersPage() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in to ProposalBuilder."
        actions={<LinkButton href="/users/new">New user</LinkButton>}
      />
      <div className="grid gap-3">
        {users.map((u) => (
          <Link key={u.id} href={`/users/${u.id}`}>
            <Card className="flex items-center justify-between hover:border-brand">
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-sm text-slate-500">{u.email}</div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  u.role === "ADMIN"
                    ? "bg-brand-light text-brand-dark"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {u.role.toLowerCase()}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
