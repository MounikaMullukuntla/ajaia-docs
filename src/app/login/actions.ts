"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

const signInSchema = z.object({ userId: z.string().min(1) });

export async function signIn(formData: FormData) {
  const parsed = signInSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) redirect("/login?error=invalid");

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) redirect("/login?error=invalid");

  (await cookies()).set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
