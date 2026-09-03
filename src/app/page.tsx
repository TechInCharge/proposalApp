import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await requireUser();

  const [proposals, products, customers] = await Promise.all([
    prisma.proposal.count(),
    prisma.product.count({ where: { archived: false } }),
    prisma.customer.count(),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ProposalBuilder</h1>
          <p className="text-sm text-gray-500">
            {session.user.email} · {session.user.role}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded border px-3 py-1.5 text-sm">Sign out</button>
        </form>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Card label="Proposals" value={proposals} href="/proposals" />
        <Card label="Products" value={products} href="/products" />
        <Card label="Customers" value={customers} href="/customers" />
      </section>

      <p className="mt-8 text-sm text-gray-500">
        Scaffold ready. Next: build the Products / Section Templates admin and the
        Proposal builder. See <code>docs/ROADMAP.md</code>.
      </p>
    </main>
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
      className="rounded-lg border p-4 transition hover:border-blue-500"
    >
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </Link>
  );
}
