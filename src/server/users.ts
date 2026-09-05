"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  createUserInput,
  updateUserInput,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validators";

export async function createUser(
  raw: CreateUserInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = createUserInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name || null,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
      },
    });
    revalidatePath("/users");
    return { ok: true, id: user.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "A user with that email already exists" };
    }
    throw e;
  }
}

export async function createUserAndRedirect(raw: CreateUserInput) {
  const res = await createUser(raw);
  if (res.ok) redirect("/users");
  return res;
}

export async function updateUser(
  id: string,
  raw: UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("ADMIN");
  const parsed = updateUserInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.role !== "ADMIN") {
    const err = await guardLastAdmin(id);
    if (err) return { ok: false, error: err };
  }

  const data: Prisma.UserUpdateInput = {
    name: parsed.data.name || null,
    role: parsed.data.role,
  };
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { ok: true };
}

export async function deleteUser(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("ADMIN");
  if (session.user.id === id) {
    return { ok: false, error: "You can't delete your own account" };
  }
  const err = await guardLastAdmin(id);
  if (err) return { ok: false, error: err };

  try {
    await prisma.user.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return {
        ok: false,
        error: "This user created proposals and can't be deleted. Reassign or delete those proposals first.",
      };
    }
    throw e;
  }
  revalidatePath("/users");
  return { ok: true };
}

/** Refuses to strip ADMIN off / delete the last remaining administrator. */
async function guardLastAdmin(targetId: string): Promise<string | null> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (target?.role !== "ADMIN") return null;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  return adminCount <= 1 ? "There must be at least one administrator" : null;
}
