"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  productInput,
  sectionTemplateInput,
  type ProductInput,
} from "@/lib/validators";
import { extractTokens } from "@/lib/placeholders";

/** Distinct {{tokens}} used anywhere in an HTML section body. */
function tokensFromBody(body: string): string[] {
  return [...new Set(extractTokens(body))];
}

export async function saveProduct(
  id: string | null,
  raw: ProductInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = {
    name: parsed.data.name,
    category: parsed.data.category || null,
    description: parsed.data.description || null,
    tags: parsed.data.tags,
  };

  const product = id
    ? await prisma.product.update({ where: { id }, data })
    : await prisma.product.create({ data });

  revalidatePath("/products");
  if (id) revalidatePath(`/products/${id}`);
  return { ok: true, id: product.id };
}

export async function setProductArchived(id: string, archived: boolean) {
  await requireRole("ADMIN");
  await prisma.product.update({ where: { id }, data: { archived } });
  revalidatePath("/products");
}

export async function saveSectionTemplate(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = sectionTemplateInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { productId, title, order } = parsed.data;
  const body = parsed.data.body as Prisma.InputJsonValue;
  const placeholders = tokensFromBody(parsed.data.body);

  if (id) {
    const existing = await prisma.sectionTemplate.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Section not found" };
    const updated = await prisma.sectionTemplate.update({
      where: { id },
      data: { title, order, body, placeholders, version: existing.version + 1 },
    });
    revalidatePath(`/products/${productId}`);
    return { ok: true, id: updated.id };
  }

  const count = await prisma.sectionTemplate.count({ where: { productId } });
  const created = await prisma.sectionTemplate.create({
    data: { productId, title, order: order || count, body, placeholders },
  });
  revalidatePath(`/products/${productId}`);
  return { ok: true, id: created.id };
}

export async function deleteSectionTemplate(id: string) {
  await requireRole("ADMIN");
  const s = await prisma.sectionTemplate.delete({ where: { id } });
  revalidatePath(`/products/${s.productId}`);
}

export async function reorderSectionTemplates(productId: string, orderedIds: string[]) {
  await requireRole("ADMIN");
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.sectionTemplate.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath(`/products/${productId}`);
}

export async function createProductAndRedirect(raw: ProductInput) {
  const res = await saveProduct(null, raw);
  if (res.ok) redirect(`/products/${res.id}`);
  return res;
}
