import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, forbidden, handle, notFound, parseBody, requireApiUser } from "@/lib/api";
import { getDocumentForUser } from "@/lib/documents";
import { createShareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/documents/:id/shares { email, role? } (owner only)
// Sharing with someone who already has access updates their role.
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireApiUser();
  const result = await getDocumentForUser(user.id, (await params).id);
  if (!result) throw notFound();
  if (!result.permissions.includes("share")) {
    throw forbidden("Only the owner can share this document");
  }

  const { email, role } = await parseBody(req, createShareSchema);
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw new ApiError(404, `No user with email ${email}`);
  if (target.id === result.document.ownerId) {
    throw new ApiError(400, "You already own this document");
  }

  const existed = result.document.shares.some((s) => s.userId === target.id);
  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: result.document.id, userId: target.id } },
    update: { role },
    create: { documentId: result.document.id, userId: target.id, role },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(share, { status: existed ? 200 : 201 });
});
