import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import { marked } from "marked";
import mammoth from "mammoth";
import { editorExtensions } from "@/lib/editor-extensions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

// Turns an uploaded file into a new editable document.
// Supported: plain text, Markdown, and Word (.docx). Everything is converted to HTML,
// then to Tiptap JSON using the editor's own schema. Anything the editor doesn't support
// (scripts, images, tables, raw HTML) is dropped during that step.

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const SUPPORTED_LABEL = ".txt, .md, .docx (max 2 MB)";

export class ImportError extends Error {}

export function getExtension(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string) {
  const ext = getExtension(filename);
  const base = (ext ? filename.slice(0, -ext.length) : filename).replace(/[_]+/g, " ").trim();
  return (base || "Imported document").slice(0, MAX_TITLE_LENGTH);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function decodeText(buffer: Buffer) {
  // A NUL byte means this is a binary file renamed to .txt/.md.
  if (buffer.includes(0)) throw new ImportError("This file doesn't look like a text file");
  return buffer.toString("utf8").replace(/^﻿/, "");
}

// Blank lines separate paragraphs; single line breaks are kept inside a paragraph.
export function textToHtml(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function fileToHtml(filename: string, buffer: Buffer): Promise<string> {
  const ext = getExtension(filename);
  switch (ext) {
    case ".txt":
      return textToHtml(decodeText(buffer));
    case ".md":
    case ".markdown":
      return marked.parse(decodeText(buffer), { gfm: true });
    case ".docx": {
      // .docx files are zip archives, which start with "PK".
      if (buffer.subarray(0, 2).toString("latin1") !== "PK") {
        throw new ImportError("This file doesn't look like a Word (.docx) document");
      }
      try {
        // mammoth ignores underline by default; keep it since the editor supports it.
        const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: ["u => u"] });
        return value;
      } catch {
        throw new ImportError("Couldn't read this Word document. Is it a valid .docx file?");
      }
    }
    default:
      throw new ImportError(`Unsupported file type. Supported: ${SUPPORTED_LABEL}`);
  }
}

export function htmlToDoc(html: string): JSONContent {
  return generateJSON(html, editorExtensions);
}

// True if the document has any visible text.
export function hasText(node: JSONContent): boolean {
  if (node.type === "text") return !!node.text?.trim();
  return (node.content ?? []).some(hasText);
}

export async function importFile(filename: string, buffer: Buffer) {
  if (buffer.length === 0) throw new ImportError("The file is empty");
  if (buffer.length > MAX_IMPORT_BYTES) throw new ImportError("File is too large (max 2 MB)");

  const content = htmlToDoc(await fileToHtml(filename, buffer));
  if (!hasText(content)) throw new ImportError("No text found in this file");

  return { title: titleFromFilename(filename), content };
}
