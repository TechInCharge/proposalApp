"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { loadAndAssemble } from "@/lib/render/load";
import { htmlToPdf } from "@/lib/render/pdf";
import { htmlToDocxBuffer } from "@/lib/render/docx";
import { saveFile } from "@/lib/storage";
import { DEFAULT_BRAND } from "@/lib/render/assemble";

export interface GenerateResult {
  ok: boolean;
  error?: string;
  pdfUrl?: string;
  docxUrl?: string;
  missingTokens?: string[];
}

export async function generateProposal(id: string): Promise<GenerateResult> {
  await requireUser();

  const assembled = await loadAndAssemble(id);
  if (!assembled) return { ok: false, error: "Proposal not found" };

  const { html, missingTokens, proposal } = assembled;
  if (!proposal.sections.some((s) => s.included)) {
    return { ok: false, error: "Add at least one section before generating." };
  }

  const brand = proposal.brandProfile ?? DEFAULT_BRAND;
  const stamp = Date.now();

  try {
    const [pdf, docx] = await Promise.all([
      htmlToPdf(html, {
        headerText: brand.headerText,
        footerText: brand.footerText,
        showPageNumbers: brand.showPageNumbers,
      }),
      htmlToDocxBuffer(html, {
        title: proposal.title,
        footerText: brand.footerText,
        showPageNumbers: brand.showPageNumbers,
      }),
    ]);

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
