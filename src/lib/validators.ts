import { z } from "zod";

/** A permissive ProseMirror document node. */
export const proseMirrorDoc = z
  .object({ type: z.literal("doc"), content: z.array(z.any()).optional() })
  .passthrough();

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
  showPricing: z.boolean().default(false),
  currency: z.string().length(3).default("USD"),
  contactName: z.string().max(200).optional().or(z.literal("")),
  contactTitle: z.string().max(200).optional().or(z.literal("")),
  contactEmail: z.string().max(200).optional().or(z.literal("")),
  contactPhone: z.string().max(60).optional().or(z.literal("")),
});
export type ProposalInput = z.infer<typeof proposalInput>;

export const boqItemInput = z.object({
  partNumber: z.string().max(120).optional().or(z.literal("")),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().min(0),
  unit: z.string().max(20).default("ea"),
  unitPrice: z.coerce.number().min(0).default(0),
});
export type BoqItemInput = z.infer<typeof boqItemInput>;

export const boqTableInput = z.array(boqItemInput);
