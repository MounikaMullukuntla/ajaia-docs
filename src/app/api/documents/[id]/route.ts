import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, handle, notFound, parseBody, requireApiUser } from "@/lib/api";
import { getDocumentForUser } from "@/lib/documents";
import { updateDocumentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Status codes: 404 when the user can't see the doc at all (don't reveal it exists),
// 403 when they can see it but their role doesn't allow the action.

// GET /api/documents/:id -> document + the caller's role and permissions
export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const result = await getDocumentForUser(user.id, (await params).id);
  if (!result) throw notFound();
  return NextResponse.json(result);
});

// PATCH /api/documents/:id { title?, content? } (owner or editor)
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const user = await requireApiUser();
  const result = await getDocumentForUser(user.id, (await params).id);
  if (!result) throw notFound();
  if (!result.permissions.includes("edit")) throw forbidden("You have view-only access");

  const data = await parseBody(req, updateDocumentSchema);
  const document = await prisma.document.update({
    where: { id: result.document.id },
    data,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(document);
});

// DELETE /api/documents/:id (owner only)
export const DELETE = handle<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const result = await getDocumentForUser(user.id, (await params).id);
  if (!result) throw notFound();
  if (!result.permissions.includes("delete")) {
    throw forbidden("Only the owner can delete this document");
  }

  await prisma.document.delete({ where: { id: result.document.id } });
  return new NextResponse(null, { status: 204 });
});
