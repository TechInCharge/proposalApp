export type ProposalStatus = "DRAFT" | "IN_REVIEW" | "FINAL";

export interface WorkspaceProposal {
  id: string;
  title: string;
  customerId: string;
  brandProfileId: string | null;
  proposalDate: string; // yyyy-mm-dd
  reference: string;
  showPricing: boolean;
  currency: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  status: ProposalStatus;
  generatedAt: string | null;
  pdfUrl: string | null;
  docxUrl: string | null;
}

export interface WorkspaceSection {
  id: string;
  title: string;
  order: number;
  body: unknown;
  included: boolean;
  edited: boolean;
}

export interface WorkspaceBoqItem {
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface WorkspaceProduct {
  id: string;
  name: string;
  category: string | null;
  sectionCount: number;
}

export interface Option {
  id: string;
  name: string;
  isDefault?: boolean;
}
