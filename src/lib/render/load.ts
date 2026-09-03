import { prisma } from "@/lib/prisma";
import {
  assembleProposalHtml,
  DEFAULT_BRAND,
  type AssembleInput,
  type AssembleResult,
} from "@/lib/render/assemble";

export async function loadAndAssemble(
  proposalId: string,
): Promise<(AssembleResult & { proposal: NonNullable<Awaited<ReturnType<typeof getProposal>>> }) | null> {
  const proposal = await getProposal(proposalId);
  if (!proposal) return null;

  const input: AssembleInput = {
    proposal: {
      title: proposal.title,
      proposalDate: proposal.proposalDate,
      reference: proposal.reference,
      showPricing: proposal.showPricing,
      currency: proposal.currency,
    },
    customer: {
      name: proposal.customer.name,
      website: proposal.customer.website,
      logoUrl: proposal.customer.logoUrl,
    },
    brand: proposal.brandProfile
      ? {
          logoUrl: proposal.brandProfile.logoUrl,
          primaryColor: proposal.brandProfile.primaryColor,
          secondaryColor: proposal.brandProfile.secondaryColor,
          fontFamily: proposal.brandProfile.fontFamily,
          coverLayout: proposal.brandProfile.coverLayout,
          headerText: proposal.brandProfile.headerText,
          footerText: proposal.brandProfile.footerText,
          showPageNumbers: proposal.brandProfile.showPageNumbers,
        }
      : DEFAULT_BRAND,
    sections: proposal.sections
      .filter((s) => s.included)
      .map((s) => ({ id: s.id, title: s.title, body: s.body })),
    boqItems: proposal.boqItems.map((b) => ({
      partNumber: b.partNumber,
      description: b.description,
      quantity: Number(b.quantity),
      unit: b.unit,
      unitPrice: Number(b.unitPrice),
    })),
  };

  const result = await assembleProposalHtml(input);
  return { ...result, proposal };
}

function getProposal(id: string) {
  return prisma.proposal.findUnique({
    where: { id },
    include: {
      customer: true,
      brandProfile: true,
      sections: { orderBy: { order: "asc" } },
      boqItems: { orderBy: { order: "asc" } },
    },
  });
}
