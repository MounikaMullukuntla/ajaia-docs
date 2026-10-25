import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, forbidden, handle, notFound, parseBody, requireApiUser } from "@/lib/api";
import { getDocumentForUser } from "@/lib/documents";
import { updateShareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string; userId: string }> };

// Checks the caller owns the doc and that the target user actually has a share.
async function loadShareKey(ctx: Ctx) {
  const user = await requireApiUser();
  const { id, userId } = await ctx.params;
  const result = await getDocumentForUser(user.id, id);
  if (!result) throw notFound();
  if (!result.permissions.includes("share")) throw forbidden("Only the owner can manage sharing");
  if (!result.document.shares.some((s) => s.userId === userId)) {
    throw new ApiError(404, "This user doesn't have access");
  }
  return { documentId: result.document.id, userId };
}

// PATCH /api/documents/:id/shares/:userId { role } (owner only)
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const key = await loadShareKey(ctx);
  const { role } = await parseBody(req, updateShareSchema);
  const share = await prisma.documentShare.update({
    where: { documentId_userId: key },
    data: { role },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(share);
});

// DELETE /api/documents/:id/shares/:userId (owner only)
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const key = await loadShareKey(ctx);
  await prisma.documentShare.delete({ where: { documentId_userId: key } });
  return new NextResponse(null, { status: 204 });
});
