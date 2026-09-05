import { z } from "zod";

/**
 * A section body authored in CKEditor and stored as an HTML string.
 * The renderer sanitises this again on the way out (`src/lib/render/sanitize.ts`);
 * the cap here just stops a pathological payload from reaching the database.
 */
export const sectionHtmlBody = z
  .string()
  .max(500_000, "Section content is too large")
  .transform((s) => s.trim());

/**
 * Legacy ProseMirror document node — kept only for the one-off body migration
 * script (`scripts/migrate-section-bodies.ts`) and its tests. New writes use
 * `sectionHtmlBody`.
 */
export const proseMirrorDoc = z
  .object({ type: z.literal("doc"), content: z.array(z.any()).optional() })
  .passthrough()
  .transform((v) => JSON.parse(JSON.stringify(v)) as { type: "doc"; [k: string]: unknown });

export const productInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().min(1)).default([]),
});
export type ProductInput = z.infer<typeof productInput>;

export const sectionTemplateInput = z.object({
  productId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(200),
  order: z.number().int().min(0).default(0),
  body: sectionHtmlBody,
});
export type SectionTemplateInput = z.infer<typeof sectionTemplateInput>;

export const contactSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export const customerInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  contacts: z.array(contactSchema).default([]),
});
export type CustomerInput = z.infer<typeof customerInput>;

/** Optional CKEditor HTML for a custom cover — blank means "use the auto cover". */
export const coverTemplateInput = z
  .string()
  .max(500_000, "Cover content is too large")
  .transform((s) => s.trim())
  .optional();

export const brandProfileInput = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  logoUrl: z.string().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  fontFamily: z.string().min(1).max(80),
  coverLayout: z.enum(["standard", "minimal", "full-bleed"]).default("standard"),
  coverTemplate: coverTemplateInput,
  headerText: z.string().max(200).optional().or(z.literal("")),
  footerText: z.string().max(200).optional().or(z.literal("")),
  showPageNumbers: z.boolean().default(true),
});
export type BrandProfileInput = z.infer<typeof brandProfileInput>;

export const proposalInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  customerId: z.string().min(1, "Pick a customer"),
  brandProfileId: z.string().optional().or(z.literal("")),
  proposalDate: z.coerce.date().default(() => new Date()),
  reference: z.string().max(120).optional().or(z.literal("")),
  contactName: z.string().max(200).optional().or(z.literal("")),
  contactTitle: z.string().max(200).optional().or(z.literal("")),
  contactEmail: z.string().max(200).optional().or(z.literal("")),
  contactPhone: z.string().max(60).optional().or(z.literal("")),
  coverTemplate: coverTemplateInput,
});
export type ProposalInput = z.infer<typeof proposalInput>;

export const boqItemInput = z.object({
  partNumber: z.string().max(120).optional().or(z.literal("")),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().int().min(1).default(1),
});
export type BoqItemInput = z.infer<typeof boqItemInput>;

export const boqTableInput = z.array(boqItemInput);

export const boqCatalogItemInput = z.object({
  partNumber: z
    .string()
    .max(120)
    .default("")
    .transform((v) => v.trim()),
  description: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "Description is required").max(500)),
});
export type BoqCatalogItemInput = z.infer<typeof boqCatalogItemInput>;

const roleEnum = z.enum(["ADMIN", "AUTHOR"]);

export const createUserInput = z.object({
  name: z.string().max(200).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email"),
  role: roleEnum,
  password: z.string().min(8, "At least 8 characters"),
});
export type CreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = z.object({
  name: z.string().max(200).optional().or(z.literal("")),
  role: roleEnum,
  // Blank = keep the current password.
  password: z.union([z.string().min(8, "At least 8 characters"), z.literal("")]),
});
export type UpdateUserInput = z.infer<typeof updateUserInput>;
