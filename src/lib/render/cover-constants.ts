/** Client-safe cover constants (no server-only imports). */

export const COVER_PLACEHOLDERS = [
  "proposal.title",
  "proposal.date",
  "proposal.reference",
  "customer.name",
  "customer.website",
  "customer.logo",
  "brand.logo",
  "contact.name",
  "contact.title",
  "contact.email",
  "contact.phone",
] as const;

/** A starting point offered in the editor ("Load default layout"). */
export const DEFAULT_COVER_TEMPLATE = [
  "<p>{{brand.logo}}</p>",
  '<p><span style="color:#5636CE;"><strong>TECHNICAL PROPOSAL</strong></span></p>',
  "<h1>{{proposal.title}}</h1>",
  "<p>&nbsp;</p>",
  "<p><strong>Prepared for:</strong> {{customer.name}}</p>",
  "<p><strong>Attn:</strong> {{contact.name}}, {{contact.title}}</p>",
  "<p><strong>Reference:</strong> {{proposal.reference}}</p>",
  "<p><strong>Date:</strong> {{proposal.date}}</p>",
].join("");
