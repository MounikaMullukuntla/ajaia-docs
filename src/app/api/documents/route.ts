import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, parseBody, requireApiUser } from "@/lib/api";
import { createDocumentSchema, EMPTY_DOC } from "@/lib/validation";

// GET /api/documents -> { owned, shared } (list fields only, no content)
export const GET = handle(async () => {
  const user = await requireApiUser();

  const [owned, shares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      select: { id: true, title: true, updatedAt: true, _count: { select: { shares: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ]);

  return NextResponse.json({
    owned: owned.map(({ _count, ...d }) => ({ ...d, shareCount: _count.shares })),
    shared: shares.map((s) => ({ ...s.document, role: s.role })),
  });
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
