import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

/** Returns the current session or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Returns the current session or redirects; 403 if the role is insufficient. */
export async function requireRole(role: Role) {
  const session = await requireUser();
  if (role === "ADMIN" && session.user.role !== "ADMIN") {
    redirect("/403");
  }
  return session;
}
