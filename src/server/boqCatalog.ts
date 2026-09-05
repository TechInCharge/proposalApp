"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/rbac";
import { boqCatalogItemInput } from "@/lib/validators";
import { normaliseBoqCatalogRows, type BoqCatalogRow } from "@/lib/boq-catalog";

/**
 * Fold a proposal's just-saved BoQ rows into the shared catalog. Best-effort:
 * a failure here must not fail the BoQ save that called it.
 */
export async function captureBoqItems(
  rows: { partNumber?: string | null; description?: string | null }[],
): Promise<void> {
  const items = normaliseBoqCatalogRows(rows);
  if (!items.length) return;
  try {
    await prisma.$transaction(
      items.map((it) =>
        prisma.boqCatalogItem.upsert({
          where: {
            partNumber_description: {
              partNumber: it.partNumber,
              description: it.description,
            },
          },
          create: it,
          update: {},
        }),
      ),
    );
    revalidatePath("/boq-items");
  } catch (err) {
    console.error("captureBoqItems failed:", err);
  }
}

export async function listBoqCatalogItems(query?: string): Promise<BoqCatalogRow[]> {
  await requireUser();
  const q = query?.trim();
  const where: Prisma.BoqCatalogItemWhereInput = q
    ? {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { partNumber: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const items = await prisma.boqCatalogItem.findMany({
    where,
    orderBy: [{ description: "asc" }],
    take: 500,
  });
  return items.map((i) => ({
    id: i.id,
    partNumber: i.partNumber,
    description: i.description,
  }));
}

export async function createBoqCatalogItem(
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = boqCatalogItemInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const item = await prisma.boqCatalogItem.create({ data: parsed.data });
    revalidatePath("/boq-items");
    return { ok: true, id: item.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "That item is already in the library" };
    }
    throw err;
  }
}

export async function updateBoqCatalogItem(
  id: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = boqCatalogItemInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await prisma.boqCatalogItem.update({ where: { id }, data: parsed.data });
    revalidatePath("/boq-items");
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "Another library item already has that part number and description",
      };
    }
    throw err;
  }
}

export async function deleteBoqCatalogItem(id: string): Promise<void> {
  await requireRole("ADMIN");
  await prisma.boqCatalogItem.delete({ where: { id } });
  revalidatePath("/boq-items");
}
