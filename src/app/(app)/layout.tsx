import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { signOut } from "@/auth";
import { Button } from "@/components/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="px-2 py-1 font-semibold tracking-tight text-brand-dark"
            >
              ProposalBuilder
            </Link>
            <NavLink href="/proposals">Proposals</NavLink>
            <NavLink href="/customers">Customers</NavLink>
            {isAdmin && <NavLink href="/products">Products</NavLink>}
            {isAdmin && <NavLink href="/brand-profiles">Branding</NavLink>}
            {isAdmin && <NavLink href="/users">Users</NavLink>}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {session.user.email} · {session.user.role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="secondary">Sign out</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-2 py-1 text-slate-600 hover:bg-brand-light hover:text-brand-dark"
    >
      {children}
    </Link>
  );
}
