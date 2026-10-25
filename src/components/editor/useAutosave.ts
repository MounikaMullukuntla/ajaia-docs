"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { errorMessage } from "./types";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Patch = { title?: string; content?: JSONContent };

const DEBOUNCE_MS = 1000;

// Batches title/content changes and PATCHes them ~1s after the last edit.
// Only one request is in flight at a time; edits made during a save are sent next.
export function useAutosave(documentId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Patch>({});
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPending = () => Object.keys(pending.current).length > 0;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current || !hasPending()) return;

    const body = pending.current;
    pending.current = {};
    inFlight.current = true;
    setStatus("saving");

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't save"));
      setError(null);
      setStatus(hasPending() ? "unsaved" : "saved");
    } catch (err) {
      // Keep the failed changes (newer edits win) so "Retry" resends them.
      pending.current = { ...body, ...pending.current };
      setError(err instanceof Error ? err.message : "Couldn't save");
      setStatus("error");
      return;
    } finally {
      inFlight.current = false;
    }

    if (hasPending()) timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [documentId]);

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus((s) => (s === "saving" ? s : "unsaved"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPending() || inFlight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { status, error, queue, flush };
}
