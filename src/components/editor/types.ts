import type { JSONContent } from "@tiptap/react";
import type { Action, Role, ShareRole } from "@/lib/access";

export type Person = { id: string; name: string; email: string };

export type EditorDoc = {
  id: string;
  title: string;
  content: JSONContent;
  updatedAt: string;
  owner: Person;
};

export type ShareEntry = { role: ShareRole; user: Person };

export type { Action, Role, ShareRole };

// Reads `{ error }` from an API response, with a fallback if the body isn't JSON.
export async function errorMessage(res: Response, fallback = "Something went wrong") {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}
