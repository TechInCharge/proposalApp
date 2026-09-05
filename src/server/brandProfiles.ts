"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { brandProfileInput, type BrandProfileInput } from "@/lib/validators";
import { offloadDataUriImages } from "@/lib/render/images";

export async function saveBrandProfile(
  id: string | null,
  raw: BrandProfileInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = brandProfileInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = {
    ...parsed.data,
    headerText: parsed.data.headerText || null,
    footerText: parsed.data.footerText || null,
    logoUrl: parsed.data.logoUrl || null,
    coverTemplate: parsed.data.coverTemplate
      ? ((await offloadDataUriImages(parsed.data.coverTemplate)) as Prisma.InputJsonValue)
      : Prisma.DbNull,
  };

  const profile = await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.brandProfile.update({ where: { id }, data })
      : await tx.brandProfile.create({ data });
    if (saved.isDefault) {
      await tx.brandProfile.updateMany({
        where: { id: { not: saved.id } },
        data: { isDefault: false },
      });
    }
    return saved;
  });

  revalidatePath("/brand-profiles");
  return { ok: true, id: profile.id };
}

export async function createBrandProfileAndRedirect(raw: BrandProfileInput) {
  const res = await saveBrandProfile(null, raw);
  if (res.ok) redirect(`/brand-profiles/${res.id}`);
  return res;
}

export async function deleteBrandProfile(id: string) {
  await requireRole("ADMIN");
  await prisma.brandProfile.delete({ where: { id } });
  revalidatePath("/brand-profiles");
}
