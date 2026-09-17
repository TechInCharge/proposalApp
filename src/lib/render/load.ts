import { prisma } from "@/lib/prisma";
import {
  assembleProposalHtml,
  DEFAULT_BRAND,
  type AssembleInput,
  type AssembleResult,
} from "@/lib/render/assemble";

type LoadedProposal = NonNullable<Awaited<ReturnType<typeof getProposal>>>;

/**
 * Fetch a proposal and shape it into `AssembleInput`, without running either
 * HTML builder — the lean loader for generate.ts's compose-docx.ts pipeline
 * (Phase 4). `loadAndAssemble` below builds on this for the HTML-preview
 * route, which still needs full HTML output.
 */
export async function loadProposalInput(
  proposalId: string,
): Promise<{ input: AssembleInput; proposal: LoadedProposal } | null> {
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
      coverTemplate: proposal.coverTemplate,
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
          coverTemplate: proposal.brandProfile.coverTemplate,
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

  return { input, proposal };
}

export async function loadAndAssemble(
  proposalId: string,
): Promise<(AssembleResult & { proposal: LoadedProposal }) | null> {
  const loaded = await loadProposalInput(proposalId);
  if (!loaded) return null;

  const result = await assembleProposalHtml(loaded.input);
  return { ...result, proposal: loaded.proposal };
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
