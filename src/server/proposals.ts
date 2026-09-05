"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import {
  proposalInput,
  boqTableInput,
  sectionHtmlBody,
  type ProposalInput,
} from "@/lib/validators";
import { captureBoqItems } from "@/server/boqCatalog";
import { offloadDataUriImages } from "@/lib/render/images";
import type { ProposalStatus } from "@prisma/client";

function proposalWriteData(parsed: ProposalInput) {
  return {
    title: parsed.title,
    customerId: parsed.customerId,
    brandProfileId: parsed.brandProfileId || null,
    proposalDate: parsed.proposalDate,
    reference: parsed.reference || null,
    contactName: parsed.contactName || null,
    contactTitle: parsed.contactTitle || null,
    contactEmail: parsed.contactEmail || null,
    contactPhone: parsed.contactPhone || null,
  };
}

export async function createProposal(
  raw: ProposalInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = proposalInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = await prisma.proposal.create({
    data: { ...proposalWriteData(parsed.data), createdById: session.user.id },
  });
  redirect(`/proposals/${p.id}/edit`);
}

export async function updateProposalDetails(id: string, raw: ProposalInput) {
  await requireUser();
  const parsed = proposalInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  await prisma.proposal.update({
    where: { id },
    data: proposalWriteData(parsed.data),
  });
  revalidatePath(`/proposals/${id}/edit`);
  return { ok: true as const };
}

export async function setProposalStatus(id: string, status: ProposalStatus) {
  await requireUser();
  await prisma.proposal.update({ where: { id }, data: { status } });
  revalidatePath(`/proposals/${id}/edit`);
}

/**
 * Sync the selected products for a proposal.
 * - Added products: their SectionTemplates are snapshotted into ProposalSections.
 * - Removed products: their snapshot sections are deleted (edited copies included).
 */
export async function setProposalProducts(proposalId: string, productIds: string[]) {
  await requireUser();

  await prisma.$transaction(async (tx) => {
    const current = await tx.proposalProduct.findMany({ where: { proposalId } });
    const currentIds = new Set(current.map((c) => c.productId));
    const nextIds = new Set(productIds);

    const added = productIds.filter((pid) => !currentIds.has(pid));
    const removed = [...currentIds].filter((pid) => !nextIds.has(pid));

    if (removed.length) {
      await tx.proposalProduct.deleteMany({
        where: { proposalId, productId: { in: removed } },
      });
      await tx.proposalSection.deleteMany({
        where: { proposalId, sourceProductId: { in: removed } },
      });
    }

    // Re-write ordering for all selected products.
    await tx.proposalProduct.deleteMany({
      where: { proposalId, productId: { in: productIds } },
    });
    await tx.proposalProduct.createMany({
      data: productIds.map((productId, i) => ({ proposalId, productId, order: i })),
    });

    if (added.length) {
      const templates = await tx.sectionTemplate.findMany({
        where: { productId: { in: added } },
        orderBy: [{ productId: "asc" }, { order: "asc" }],
      });
      const base = await tx.proposalSection.count({ where: { proposalId } });
      if (templates.length) {
        await tx.proposalSection.createMany({
          data: templates.map((t, i) => ({
            proposalId,
            sourceTemplateId: t.id,
            sourceProductId: t.productId,
            title: t.title,
            order: base + i,
            body: t.body as Prisma.InputJsonValue,
          })),
        });
      }
    }
  });

  revalidatePath(`/proposals/${proposalId}/edit`);
}

export async function updateProposalSection(
  sectionId: string,
  data: { title?: string; body?: unknown; included?: boolean },
) {
  await requireUser();
  const patch: Record<string, unknown> = { edited: true };
  if (typeof data.title === "string") patch.title = data.title;
  if (typeof data.included === "boolean") patch.included = data.included;
  if (data.body !== undefined) {
    const parsed = sectionHtmlBody.safeParse(data.body);
    if (!parsed.success) return { ok: false as const, error: "Invalid body" };
    patch.body = (await offloadDataUriImages(parsed.data)) as Prisma.InputJsonValue;
  }
  const s = await prisma.proposalSection.update({
    where: { id: sectionId },
    data: patch,
  });
  revalidatePath(`/proposals/${s.proposalId}/edit`);
  return { ok: true as const };
}

export async function reorderProposalSections(proposalId: string, orderedIds: string[]) {
  await requireUser();
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.proposalSection.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath(`/proposals/${proposalId}/edit`);
}

export async function saveBoq(proposalId: string, rows: unknown) {
  await requireUser();
  const parsed = boqTableInput.safeParse(rows);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  await prisma.$transaction(async (tx) => {
    await tx.boqItem.deleteMany({ where: { proposalId } });
    if (parsed.data.length) {
      await tx.boqItem.createMany({
        data: parsed.data.map((r, i) => ({
          proposalId,
          order: i,
          partNumber: r.partNumber || null,
          description: r.description,
          quantity: r.quantity,
        })),
      });
    }
  });
  // Grow the shared library from what people actually quote.
  await captureBoqItems(parsed.data);
  revalidatePath(`/proposals/${proposalId}/edit`);
  return { ok: true as const };
}

/**
 * Re-sync section snapshots with their source templates.
 * - Non-edited sections are overwritten from the current template.
 * - Templates with no snapshot yet are appended.
 * - Snapshots whose template no longer exists are reported, not deleted.
 */
export async function refreshProposalSections(proposalId: string): Promise<
  | { ok: true; updated: number; added: number; orphaned: number; skippedEdited: number }
  | { ok: false; error: string }
> {
  await requireUser();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { products: true, sections: { orderBy: { order: "asc" } } },
  });
  if (!proposal) return { ok: false, error: "Proposal not found" };

  const productIds = proposal.products.map((p) => p.productId);
  const templates = productIds.length
    ? await prisma.sectionTemplate.findMany({
        where: { productId: { in: productIds } },
        orderBy: [{ productId: "asc" }, { order: "asc" }],
      })
    : [];

  const bySource = new Map(
    proposal.sections
      .filter((s) => s.sourceTemplateId)
      .map((s) => [s.sourceTemplateId as string, s]),
  );
  const validIds = new Set(templates.map((t) => t.id));

  let updated = 0;
  let added = 0;
  let skippedEdited = 0;
  let nextOrder = proposal.sections.length;

  await prisma.$transaction(async (tx) => {
    for (const t of templates) {
      const existing = bySource.get(t.id);
      if (!existing) {
        await tx.proposalSection.create({
          data: {
            proposalId,
            sourceTemplateId: t.id,
            sourceProductId: t.productId,
            title: t.title,
            order: nextOrder++,
            body: t.body as Prisma.InputJsonValue,
          },
        });
        added++;
        continue;
      }
      if (existing.edited) {
        skippedEdited++;
        continue;
      }
      if (
        existing.title !== t.title ||
        JSON.stringify(existing.body) !== JSON.stringify(t.body)
      ) {
        await tx.proposalSection.update({
          where: { id: existing.id },
          data: { title: t.title, body: t.body as Prisma.InputJsonValue },
        });
        updated++;
      }
    }
  });

  const orphaned = proposal.sections.filter(
    (s) => s.sourceTemplateId && !validIds.has(s.sourceTemplateId),
  ).length;

  revalidatePath(`/proposals/${proposalId}/edit`);
  return { ok: true, updated, added, orphaned, skippedEdited };
}

export async function parseBoqUpload(
  form: FormData,
): Promise<
  | { ok: true; rows: unknown[]; skipped: number }
  | { ok: false; error: string }
> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "File must be under 5 MB" };
  }
  const name = file.name.toLowerCase();
  if (!/\.(xlsx|csv)$/.test(name)) {
    return { ok: false, error: "Upload a .xlsx or .csv file" };
  }
  try {
    const { parseBoqBuffer } = await import("@/lib/boq-import");
    const buf = Buffer.from(await file.arrayBuffer());
    const { rows, skipped } = await parseBoqBuffer(buf, name);
    if (rows.length === 0) {
      return { ok: false, error: "No usable rows found. Expected a 'Description' column." };
    }
    return { ok: true, rows, skipped };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not parse the file",
    };
  }
}

/** Deep-copy a proposal (details, product links, sections, BoQ). Not the artifacts. */
export async function duplicateProposal(
  id: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireUser();
  const source = await prisma.proposal.findUnique({
    where: { id },
    include: { products: true, sections: true, boqItems: true },
  });
  if (!source) return { ok: false, error: "Proposal not found" };

  const copy = await prisma.proposal.create({
    data: {
      title: `${source.title} (copy)`,
      customerId: source.customerId,
      brandProfileId: source.brandProfileId,
      proposalDate: source.proposalDate,
      reference: source.reference,
      contactName: source.contactName,
      contactTitle: source.contactTitle,
      contactEmail: source.contactEmail,
      contactPhone: source.contactPhone,
      createdById: session.user.id,
      products: {
        create: source.products.map((p) => ({
          productId: p.productId,
          order: p.order,
        })),
      },
      sections: {
        create: source.sections.map((s) => ({
          sourceTemplateId: s.sourceTemplateId,
          sourceProductId: s.sourceProductId,
          title: s.title,
          order: s.order,
          body: s.body as Prisma.InputJsonValue,
          included: s.included,
          edited: s.edited,
        })),
      },
      boqItems: {
        create: source.boqItems.map((b) => ({
          order: b.order,
          partNumber: b.partNumber,
          description: b.description,
          quantity: b.quantity,
        })),
      },
    },
  });

  revalidatePath("/proposals");
  return { ok: true, id: copy.id };
}

export async function deleteProposal(id: string) {
  await requireUser();
  await prisma.proposal.delete({ where: { id } });
  revalidatePath("/proposals");
  redirect("/proposals");
}
