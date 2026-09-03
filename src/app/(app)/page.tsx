import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";

  const [proposals, products, customers] = await Promise.all([
    prisma.proposal.count(),
    prisma.product.count({ where: { archived: false } }),
    prisma.customer.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Assemble technical proposals from per-product section templates."
      />
      <section className="grid grid-cols-3 gap-4">
        <Card label="Proposals" value={proposals} href="/proposals" />
        <Card label="Customers" value={customers} href="/customers" />
        {isAdmin && <Card label="Products" value={products} href="/products" />}
      </section>
    </>
  );
}

function Card({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-500"
    >
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </Link>
  );
}
