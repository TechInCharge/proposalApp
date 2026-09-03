import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";

export default async function BrandProfilesPage() {
  await requireRole("ADMIN");
  const profiles = await prisma.brandProfile.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader
        title="Branding"
        description="Colour, font, cover and header/footer presets applied when generating."
        actions={<LinkButton href="/brand-profiles/new">New profile</LinkButton>}
      />
      {profiles.length === 0 ? (
        <EmptyState title="No brand profiles yet">
          <LinkButton href="/brand-profiles/new" variant="secondary">
            Create one
          </LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <Link key={p.id} href={`/brand-profiles/${p.id}`}>
              <Card className="flex items-center gap-3 hover:border-blue-500">
                <div
                  className="h-8 w-8 rounded"
                  style={{ background: p.primaryColor }}
                />
                <div
                  className="h-8 w-8 rounded"
                  style={{ background: p.secondaryColor }}
                />
                <div>
                  <div className="font-medium">
                    {p.name}
                    {p.isDefault && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">{p.fontFamily}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
