"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { editorExtensions } from "@/lib/editor-extensions";
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
    extensions: editorExtensions,
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
        <Link
          href="/"
          className="rounded-md px-2 py-1 text-sm text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-ink-100"
        >
          ← All documents
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              role === "viewer"
                ? "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                : "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"
            }`}
          >
            {ROLE_BADGE[role]}
          </span>
          {canShare && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Share{shares.length > 0 && ` (${shares.length})`}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg border border-ink-200 bg-surface px-3.5 py-1.5 text-sm text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-red-950"
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
          className="w-full rounded-lg bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight outline-none transition-colors hover:bg-ink-100/70 focus:bg-surface focus:ring-2 focus:ring-brand-200 read-only:hover:bg-transparent dark:hover:bg-ink-900 dark:focus:ring-brand-800"
        />
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-ink-500">
          {role !== "owner" && <span>Owned by {doc.owner.name}</span>}
          {canEdit && (
            <span
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 ${status === "error" ? "text-red-600" : ""}`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  status === "error"
                    ? "bg-red-500"
                    : status === "saved"
                      ? "bg-brand-400"
                      : "animate-pulse bg-brand-500"
                }`}
              />
              {status === "error" && error ? `${STATUS_TEXT.error}: ${error}` : STATUS_TEXT[status]}
            </span>
          )}
          {status === "error" && (
            <button type="button" onClick={flush} className="font-medium text-brand-600 hover:underline">
              Retry
            </button>
          )}
          {titleError && <span className="text-red-600">{titleError}</span>}
        </div>
      </div>

      {!canEdit && (
        <p className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          You have view-only access to this document.
        </p>
      )}

      {canEdit && editor && (
        // Sits just below the sticky 3.5rem header.
        <div className="sticky top-14 z-20 mt-4 bg-background/90 py-2 backdrop-blur">
          <Toolbar editor={editor} />
        </div>
      )}

      <div className="mt-2 min-h-[70vh] rounded-xl border border-ink-200 bg-surface px-6 py-10 shadow-sm sm:px-16 sm:py-14 dark:border-ink-800">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <p className="text-sm text-ink-400">Loading editor…</p>
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
