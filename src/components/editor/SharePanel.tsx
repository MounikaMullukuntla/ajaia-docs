"use client";

import { useState } from "react";
import { errorMessage, type Person, type ShareEntry, type ShareRole } from "./types";

type Props = {
  documentId: string;
  owner: Person;
  shares: ShareEntry[];
  onChange: (shares: ShareEntry[]) => void;
  onClose: () => void;
};

const ROLE_LABEL: Record<ShareRole, string> = { VIEWER: "Viewer", EDITOR: "Editor" };

export default function SharePanel({ documentId, owner, shares, onChange, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/documents/${documentId}/shares`;

  async function run(request: () => Promise<Response>, apply: (res: Response) => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) throw new Error(await errorMessage(res));
      await apply(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const upsert = (entry: ShareEntry) => {
    const exists = shares.some((s) => s.user.id === entry.user.id);
    onChange(exists ? shares.map((s) => (s.user.id === entry.user.id ? entry : s)) : [...shares, entry]);
  };

  const addShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Enter an email address");
    run(
      () =>
        fetch(base, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, role }),
        }),
      async (res) => {
        upsert(await res.json());
        setEmail("");
      },
    );
  };

  const changeRole = (userId: string, newRole: ShareRole) =>
    run(
      () =>
        fetch(`${base}/${userId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }),
      async (res) => upsert(await res.json()),
    );

  const removeShare = (userId: string) =>
    run(
      () => fetch(`${base}/${userId}`, { method: "DELETE" }),
      async () => onChange(shares.filter((s) => s.user.id !== userId)),
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 px-4 pt-24 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-6 shadow-2xl dark:border-ink-800">
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-semibold">
            Share document
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-ink-100">
            ✕
          </button>
        </div>

        <form onSubmit={addShare} className="mt-4 flex gap-2">
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email, e.g. bob@demo.com"
            aria-label="Email to share with"
            className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:focus:ring-brand-900"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            aria-label="Role"
            className="rounded-lg border border-ink-200 bg-surface px-2 py-2 text-sm outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:focus:ring-brand-900"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            Share
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-400">People with access</h3>
        <ul className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
          <li className="flex items-center justify-between py-2 text-sm">
            <span>
              <span className="block font-medium">{owner.name} (you)</span>
              <span className="block text-ink-500">{owner.email}</span>
            </span>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">Owner</span>
          </li>
          {shares.map((s) => (
            <li key={s.user.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.user.name}</span>
                <span className="block truncate text-ink-500">{s.user.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <select
                  value={s.role}
                  disabled={busy}
                  onChange={(e) => changeRole(s.user.id, e.target.value as ShareRole)}
                  aria-label={`Role for ${s.user.name}`}
                  className="rounded-md border border-ink-200 bg-surface px-1.5 py-1 text-sm dark:border-ink-700"
                >
                  {(Object.keys(ROLE_LABEL) as ShareRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeShare(s.user.id)}
                  className="rounded-md px-2 py-1 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        {shares.length === 0 && (
          <p className="mt-1 text-sm text-ink-500">Not shared with anyone yet.</p>
        )}
      </div>
    </div>
  );
}
