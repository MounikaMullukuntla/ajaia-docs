import { describe, it, expect } from "vitest";
import {
  createShareSchema,
  MAX_CONTENT_BYTES,
  MAX_TITLE_LENGTH,
  updateDocumentSchema,
} from "@/lib/validation";

describe("updateDocumentSchema", () => {
  it("trims titles and rejects empty or overly long ones", () => {
    expect(updateDocumentSchema.parse({ title: "  Plan  " }).title).toBe("Plan");
    expect(updateDocumentSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      updateDocumentSchema.safeParse({ title: "x".repeat(MAX_TITLE_LENGTH + 1) }).success,
    ).toBe(false);
  });

  it("requires something to update", () => {
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
  });

  it("accepts Tiptap JSON and rejects other shapes", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    };
    expect(updateDocumentSchema.safeParse({ content: doc }).success).toBe(true);
    expect(updateDocumentSchema.safeParse({ content: "<p>html</p>" }).success).toBe(false);
    expect(updateDocumentSchema.safeParse({ content: { type: "paragraph" } }).success).toBe(false);
  });

  it("rejects oversized documents", () => {
    const big = { type: "doc", content: [{ type: "paragraph", text: "x".repeat(MAX_CONTENT_BYTES) }] };
    expect(updateDocumentSchema.safeParse({ content: big }).success).toBe(false);
  });
});

describe("createShareSchema", () => {
  it("normalizes email and defaults to viewer", () => {
    expect(createShareSchema.parse({ email: " Bob@Demo.com " })).toEqual({
      email: "bob@demo.com",
      role: "VIEWER",
    });
  });

  it("rejects bad emails and unknown roles", () => {
    expect(createShareSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(createShareSchema.safeParse({ email: "bob@demo.com", role: "ADMIN" }).success).toBe(
      false,
    );
  });
});
