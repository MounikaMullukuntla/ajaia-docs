"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Kept in sync with src/lib/import.ts (not imported, so the server-only
// converters don't end up in the browser bundle).
const ACCEPT = ".txt,.md,.markdown,.docx";
const MAX_BYTES = 2 * 1024 * 1024;
const LABEL = ".txt, .md, .docx (max 2 MB)";

type Progress =
  | { stage: "idle" }
  | { stage: "uploading"; percent: number; fileName: string }
  | { stage: "processing"; fileName: string };

// fetch() can't report upload progress, so use XMLHttpRequest.
function uploadWithProgress(file: File, onProgress: (percent: number) => void) {
  return new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/import");
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const body = xhr.response as { id?: string; error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) resolve({ id: body.id });
      else reject(new Error(body?.error ?? "Import failed"));
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export default function ImportButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress>({ stage: "idle" });
  const [error, setError] = useState<string | null>(null);
  const busy = progress.stage !== "idle";

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setError(null);

    // Quick checks in the browser; the server checks again.
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.split(",").includes(ext)) return setError(`Unsupported file type. Supported: ${LABEL}`);
    if (file.size > MAX_BYTES) return setError("File is too large (max 2 MB)");

    setProgress({ stage: "uploading", percent: 0, fileName: file.name });
    try {
      const { id } = await uploadWithProgress(file, (percent) =>
        // Once every byte is sent, the server is still converting the file.
        setProgress(
          percent >= 100
            ? { stage: "processing", fileName: file.name }
            : { stage: "uploading", percent, fileName: file.name },
        ),
      );
      setProgress({ stage: "processing", fileName: file.name });
      router.push(`/documents/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress({ stage: "idle" });
    }
  }

  const percent = progress.stage === "uploading" ? progress.percent : 100;

  return (
    <div className="w-full max-w-xs">
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-lg border border-ink-200 bg-surface px-3.5 py-2 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200 dark:hover:border-brand-700 dark:hover:text-brand-200"
      >
        {progress.stage === "uploading"
          ? `Uploading… ${progress.percent}%`
          : progress.stage === "processing"
            ? "Processing…"
            : "Import file"}
      </button>

      {busy ? (
        <div className="mt-2" aria-live="polite">
          <div className="flex justify-between gap-2 text-xs text-ink-500">
            <span className="truncate">{progress.fileName}</span>
            <span className="shrink-0 tabular-nums">
              {progress.stage === "uploading" ? `${progress.percent}%` : "Converting…"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-ink-800"
          >
            <div
              className={`h-full rounded-full bg-brand-600 transition-[width] duration-200 ${
                progress.stage === "processing" ? "animate-pulse" : ""
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-ink-500">Supports {LABEL}</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
