import { describe, it, expect } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { importFile, ImportError, MAX_IMPORT_BYTES, titleFromFilename } from "@/lib/import";

const buf = (s: string) => Buffer.from(s, "utf8");
const types = (doc: JSONContent) => (doc.content ?? []).map((n) => n.type);
const textOf = (node: JSONContent): string =>
  node.type === "text" ? node.text ?? "" : (node.content ?? []).map(textOf).join("");

describe("importFile: markdown", () => {
  it("keeps headings, lists and inline formatting", async () => {
    const md = "# Plan\n\n## Goals\n\nSome **bold** and *italic* text.\n\n- one\n- two\n\n1. first\n2. second\n";
    const { title, content } = await importFile("q3-plan.md", buf(md));

    expect(title).toBe("q3-plan");
    expect(types(content)).toEqual(["heading", "heading", "paragraph", "bulletList", "orderedList"]);
    expect(content.content![0].attrs?.level).toBe(1);
    expect(content.content![1].attrs?.level).toBe(2);

    const marks = content.content![2].content!.flatMap((n) => n.marks?.map((m) => m.type) ?? []);
    expect(marks).toEqual(["bold", "italic"]);
    expect(content.content![3].content).toHaveLength(2);
  });

  it("drops raw HTML the editor doesn't support, like scripts", async () => {
    const { content } = await importFile("x.md", buf("Hello\n\n<script>alert(1)</script>\n"));
    expect(JSON.stringify(content)).not.toContain("script");
    expect(textOf(content)).toContain("Hello");
  });
});

describe("importFile: plain text", () => {
  it("turns blank-line-separated blocks into paragraphs and escapes HTML", async () => {
    const { content } = await importFile("notes.txt", buf("First line\nsame para\r\n\r\n<b>not bold</b>"));
    expect(types(content)).toEqual(["paragraph", "paragraph"]);
    expect(content.content![0].content!.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
    expect(textOf(content.content![1])).toBe("<b>not bold</b>");
    expect(JSON.stringify(content)).not.toContain('"bold"');
  });
});

describe("importFile: rejects bad input", () => {
  const rejects = (name: string, data: Buffer, message: RegExp) =>
    expect(importFile(name, data)).rejects.toThrow(message);

  it("rejects unsupported, empty, oversized, and disguised files", async () => {
    await rejects("photo.png", buf("x"), /Unsupported file type/);
    await rejects("empty.txt", buf(""), /empty/);
    await rejects("blank.md", buf("   \n\n  "), /No text/);
    await rejects("big.txt", Buffer.alloc(MAX_IMPORT_BYTES + 1, 97), /too large/);
    await rejects("binary.txt", Buffer.from([0x68, 0x00, 0x69]), /text file/);
    await rejects("fake.docx", buf("not a zip"), /Word/);
    await expect(importFile("photo.png", buf("x"))).rejects.toBeInstanceOf(ImportError);
  });
});

describe("titleFromFilename", () => {
  it("strips the extension and falls back when empty", () => {
    expect(titleFromFilename("Meeting_notes.DOCX")).toBe("Meeting notes");
    expect(titleFromFilename(".md")).toBe("Imported document");
  });
});
