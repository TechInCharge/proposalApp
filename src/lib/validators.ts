import { z } from "zod";

/**
 * A permissive ProseMirror document node.
 *
 * The `.transform` deep-clones to plain JSON. When a rich body (tables,
 * images, nested marks) is sent to a Server Action, React 19 can hand parts
 * of it to the server as "temporary references" — lazy proxies that throw
 * when Prisma introspects them (`Cannot access toStringTag`). A structural
 * clone collapses them back to plain data before anything persists it.
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
  body: proseMirrorDoc,
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

export const brandProfileInput = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  logoUrl: z.string().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
  fontFamily: z.string().min(1).max(80),
  coverLayout: z.enum(["standard", "minimal", "full-bleed"]).default("standard"),
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
});
export type ProposalInput = z.infer<typeof proposalInput>;

export const boqItemInput = z.object({
  partNumber: z.string().max(120).optional().or(z.literal("")),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().int().min(1).default(1),
});
export type BoqItemInput = z.infer<typeof boqItemInput>;

export const boqTableInput = z.array(boqItemInput);

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
