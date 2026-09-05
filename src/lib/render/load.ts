import { prisma } from "@/lib/prisma";
import {
  assembleProposalHtml,
  DEFAULT_BRAND,
  type AssembleInput,
  type AssembleResult,
} from "@/lib/render/assemble";
import { assembleProposalDocxHtml } from "@/lib/render/assemble-docx";

export async function loadAndAssemble(
  proposalId: string,
): Promise<
  | (AssembleResult & {
      docxHtml: string;
      proposal: NonNullable<Awaited<ReturnType<typeof getProposal>>>;
    })
  | null
> {
  const proposal = await getProposal(proposalId);
  if (!proposal) return null;

  const input: AssembleInput = {
    proposal: {
      title: proposal.title,
      proposalDate: proposal.proposalDate,
      reference: proposal.reference,
      contactName: proposal.contactName,
      contactTitle: proposal.contactTitle,
      contactEmail: proposal.contactEmail,
      contactPhone: proposal.contactPhone,
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
      quantity: b.quantity,
    })),
  };

  const [result, docx] = await Promise.all([
    assembleProposalHtml(input),
    assembleProposalDocxHtml(input),
  ]);
  return { ...result, docxHtml: docx.html, proposal };
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
