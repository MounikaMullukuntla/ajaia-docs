"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/components/editor/types";

export default function NewDocumentButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Couldn't create a document"));
      const { id } = await res.json();
      router.push(`/documents/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a document");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : "+ New document"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
