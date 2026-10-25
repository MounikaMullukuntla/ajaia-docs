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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-semibold">
            Share document
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
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
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            aria-label="Role"
            className="rounded-md border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Share
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <h3 className="mt-5 text-sm font-medium text-neutral-500">People with access</h3>
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          <li className="flex items-center justify-between py-2 text-sm">
            <span>
              <span className="block font-medium">{owner.name} (you)</span>
              <span className="block text-neutral-500">{owner.email}</span>
            </span>
            <span className="text-neutral-500">Owner</span>
          </li>
          {shares.map((s) => (
            <li key={s.user.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.user.name}</span>
                <span className="block truncate text-neutral-500">{s.user.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <select
                  value={s.role}
                  disabled={busy}
                  onChange={(e) => changeRole(s.user.id, e.target.value as ShareRole)}
                  aria-label={`Role for ${s.user.name}`}
                  className="rounded border border-neutral-200 bg-transparent px-1 py-1 dark:border-neutral-700"
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
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        {shares.length === 0 && (
          <p className="mt-1 text-sm text-neutral-500">Not shared with anyone yet.</p>
        )}
      </div>
    </div>
  );
}
