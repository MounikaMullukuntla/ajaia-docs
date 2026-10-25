"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Toolbar from "./Toolbar";
import SharePanel from "./SharePanel";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { errorMessage, type Action, type EditorDoc, type Role, type ShareEntry } from "./types";

type Props = {
  doc: EditorDoc;
  role: Role;
  permissions: Action[];
  initialShares: ShareEntry[];
};

const ROLE_BADGE: Record<Role, string> = { owner: "Owner", editor: "Can edit", viewer: "View only" };

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save",
};

export default function DocumentEditor({ doc, role, permissions, initialShares }: Props) {
  const router = useRouter();
  const canEdit = permissions.includes("edit");
  const canShare = permissions.includes("share");
  const canDelete = permissions.includes("delete");

  const { status, error, queue, flush } = useAutosave(doc.id);
  const [title, setTitle] = useState(doc.title);
  const [savedTitle, setSavedTitle] = useState(doc.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [shares, setShares] = useState(initialShares);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Underline],
    content: doc.content,
    editable: canEdit,
    // Avoid hydration mismatches: render the editor on the client only.
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document content" },
    },
    onUpdate: ({ editor }) => queue({ content: editor.getJSON() }),
  });

  useEffect(() => {
    document.title = `${title.trim() || "Untitled document"} · Ajaia Docs`;
  }, [title]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!value.trim()) {
      setTitleError("Title can't be empty");
      return;
    }
    setTitleError(null);
    queue({ title: value.trim() });
    setSavedTitle(value.trim());
  }

  function onTitleBlur() {
    // An empty title isn't saved; put the last good one back.
    if (!title.trim()) {
      setTitle(savedTitle);
      setTitleError(null);
    }
    flush();
  }

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
      alert(await errorMessage(res, "Couldn't delete the document"));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← All documents
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {ROLE_BADGE[role]}
          </span>
          {canShare && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Share{shares.length > 0 && ` (${shares.length})`}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-red-950"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus("start");
            }
          }}
          readOnly={!canEdit}
          maxLength={200}
          aria-label="Document title"
          aria-invalid={!!titleError}
          className="w-full rounded-md bg-transparent px-1 py-1 text-2xl font-semibold outline-none hover:bg-neutral-50 focus:bg-neutral-50 read-only:hover:bg-transparent dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
        />
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-neutral-500">
          {role !== "owner" && <span>Owned by {doc.owner.name}</span>}
          {canEdit && (
            <span aria-live="polite" className={status === "error" ? "text-red-600" : undefined}>
              {status === "error" && error ? `${STATUS_TEXT.error}: ${error}` : STATUS_TEXT[status]}
            </span>
          )}
          {status === "error" && (
            <button type="button" onClick={flush} className="font-medium text-blue-600 hover:underline">
              Retry
            </button>
          )}
          {titleError && <span className="text-red-600">{titleError}</span>}
        </div>
      </div>

      {!canEdit && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You have view-only access to this document.
        </p>
      )}

      {canEdit && editor && (
        <div className="sticky top-0 z-10 mt-4 bg-[var(--background)] py-2">
          <Toolbar editor={editor} />
        </div>
      )}

      <div className="mt-2 rounded-lg border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-12 dark:border-neutral-800 dark:bg-neutral-900">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <p className="text-sm text-neutral-400">Loading editor…</p>
        )}
      </div>

      {shareOpen && (
        <SharePanel
          documentId={doc.id}
          owner={doc.owner}
          shares={shares}
          onChange={setShares}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}
