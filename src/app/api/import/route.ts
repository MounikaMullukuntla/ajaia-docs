import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handle, requireApiUser } from "@/lib/api";
import { importFile, ImportError, MAX_IMPORT_BYTES } from "@/lib/import";
import { contentSchema } from "@/lib/validation";

// POST /api/import (multipart/form-data, field "file") -> 201 { id, title }
// Creates a new document owned by the caller from a .txt, .md, or .docx file.
export const POST = handle(async (req) => {
  const user = await requireApiUser();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Upload a file using the form");
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose a file to import");
  // Check the declared size before reading the whole file into memory.
  if (file.size > MAX_IMPORT_BYTES) throw new ApiError(413, "File is too large (max 2 MB)");

  let imported;
  try {
    imported = await importFile(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof ImportError) throw new ApiError(400, err.message);
    throw err;
  }

  // Same checks as a normal save (e.g. overall document size).
  const content = contentSchema.safeParse(imported.content);
  if (!content.success) throw new ApiError(400, content.error.issues[0]?.message ?? "Invalid document");

  const document = await prisma.document.create({
    data: { title: imported.title, content: content.data, ownerId: user.id },
    select: { id: true, title: true },
  });
  return NextResponse.json(document, { status: 201 });
});
