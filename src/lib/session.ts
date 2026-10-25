import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

// Mocked auth: the signed-in user's id lives in a cookie.
// Fine for a demo with seeded accounts; not real authentication.
export const SESSION_COOKIE = "ajaia_uid";

export async function getCurrentUser() {
  const userId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// For pages: send signed-out users (or stale cookies) to /login.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
