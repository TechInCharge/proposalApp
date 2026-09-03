"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { customerInput, type CustomerInput } from "@/lib/validators";
import { saveFile } from "@/lib/storage";

export async function saveCustomer(
  id: string | null,
  raw: CustomerInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireUser();
  const parsed = customerInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = {
    name: parsed.data.name,
    website: parsed.data.website || null,
    logoUrl: parsed.data.logoUrl || null,
    contacts: parsed.data.contacts,
  };
  const c = id
    ? await prisma.customer.update({ where: { id }, data })
    : await prisma.customer.create({ data });

  revalidatePath("/customers");
  return { ok: true, id: c.id };
}

export async function createCustomerAndRedirect(raw: CustomerInput) {
  const res = await saveCustomer(null, raw);
  if (res.ok) redirect(`/customers/${res.id}`);
  return res;
}

export async function uploadCustomerLogo(
  customerId: string,
  form: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireUser();
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Logo must be under 5 MB" };
  }
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  const { url } = await saveFile(buf, { prefix: `customers/${customerId}`, ext });
  await prisma.customer.update({ where: { id: customerId }, data: { logoUrl: url } });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, url };
}
