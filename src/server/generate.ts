"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { loadProposalInput } from "@/lib/render/load";
import { composeProposalDocument } from "@/lib/render/compose-proposal";
import { docxToPdf } from "@/lib/render/docx-to-pdf";
import { saveFile } from "@/lib/storage";

export interface GenerateResult {
  ok: boolean;
  error?: string;
  pdfUrl?: string;
  docxUrl?: string;
  missingTokens?: string[];
}

export async function generateProposal(id: string): Promise<GenerateResult> {
  await requireUser();

  const loaded = await loadProposalInput(id);
  if (!loaded) return { ok: false, error: "Proposal not found" };

  const { input, proposal } = loaded;
  if (!proposal.sections.some((s) => s.included)) {
    return { ok: false, error: "Add at least one section before generating." };
  }

  const stamp = Date.now();

  try {
    const { docx, missingTokens } = await composeProposalDocument(input);
    const pdf = await docxToPdf(docx);

    const [{ url: pdfUrl }, { url: docxUrl }] = await Promise.all([
      saveFile(pdf, { prefix: `proposals/${id}`, ext: "pdf", filename: `proposal-${stamp}.pdf` }),
      saveFile(docx, { prefix: `proposals/${id}`, ext: "docx", filename: `proposal-${stamp}.docx` }),
    ]);

    await prisma.proposal.update({
      where: { id },
      data: { pdfUrl, docxUrl, generatedAt: new Date() },
    });

    revalidatePath(`/proposals/${id}/edit`);
    return { ok: true, pdfUrl, docxUrl, missingTokens };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed",
    };
  }
}
