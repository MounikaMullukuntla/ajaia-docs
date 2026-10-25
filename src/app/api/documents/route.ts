import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, parseBody, requireApiUser } from "@/lib/api";
import { listDocumentsForUser } from "@/lib/documents";
import { createDocumentSchema, EMPTY_DOC } from "@/lib/validation";

// GET /api/documents -> { owned, shared } (list fields only, no content)
export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json(await listDocumentsForUser(user.id));
});

// POST /api/documents { title?, content? } -> 201 created document
export const POST = handle(async (req) => {
  const user = await requireApiUser();
  const { title, content } = await parseBody(req, createDocumentSchema);

  const document = await prisma.document.create({
    data: { title: title ?? "Untitled document", content: content ?? EMPTY_DOC, ownerId: user.id },
  });
  return NextResponse.json(document, { status: 201 });
});
