import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, LinkButton, Card } from "@/components/ui";
import { BrandProfileForm } from "@/components/BrandProfileForm";
import { DeleteBrandProfileButton } from "@/components/DeleteBrandProfileButton";

export default async function BrandProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const profile = await prisma.brandProfile.findUnique({ where: { id } });
  if (!profile) notFound();

  return (
    <>
      <PageHeader
        title={profile.name}
        actions={
          <>
            <DeleteBrandProfileButton id={profile.id} />
            <LinkButton href="/brand-profiles" variant="secondary">
              Back
            </LinkButton>
          </>
        }
      />
      <Card>
        <BrandProfileForm
          profile={{
            id: profile.id,
            name: profile.name,
            isDefault: profile.isDefault,
            primaryColor: profile.primaryColor,
            secondaryColor: profile.secondaryColor,
            fontFamily: profile.fontFamily,
            coverLayout: profile.coverLayout,
            headerText: profile.headerText,
            footerText: profile.footerText,
            showPageNumbers: profile.showPageNumbers,
          }}
        />
      </Card>
    </>
  );
}
