import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Shared input schemas for the API. Kept separate from route handlers so they can be unit tested.

export const MAX_TITLE_LENGTH = 200;
// Generous for text documents; stops someone from storing huge blobs.
export const MAX_CONTENT_BYTES = 1_000_000;

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

// Tiptap/ProseMirror JSON. We check the top-level shape and size; the editor
// owns the inner node structure.
export const contentSchema = z
  .looseObject({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_BYTES, "Document is too large")
  // Parsed from JSON, so it is JSON-safe; tell Prisma's Json column type that.
  .transform((doc) => doc as Prisma.InputJsonObject);

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
});

export const updateDocumentSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((d) => d.title !== undefined || d.content !== undefined, "Nothing to update");

export const shareRoleSchema = z.enum(["VIEWER", "EDITOR"]);

export const createShareSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: shareRoleSchema.default("VIEWER"),
});

export const updateShareSchema = z.object({ role: shareRoleSchema });
