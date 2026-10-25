import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listDocumentsForUser } from "@/lib/documents";
import ImportButton from "@/components/ImportButton";
import NewDocumentButton from "@/components/NewDocumentButton";
import RelativeTime from "@/components/RelativeTime";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { VIEWER: "Viewer", EDITOR: "Editor" } as const;

function DocIcon() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    </span>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</h2>
        <span className="text-xs text-ink-400">{count}</span>
      </div>
      {count === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-700">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-sm dark:divide-ink-800 dark:border-ink-800">
          {children}
        </ul>
      )}
    </section>
  );
}

function Row({
  href,
  title,
  meta,
  badge,
  badgeStrong,
}: {
  href: string;
  title: string;
  meta: React.ReactNode;
  badge: React.ReactNode;
  badgeStrong?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50/60 dark:hover:bg-ink-800/60"
      >
        <DocIcon />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium group-hover:text-brand-700 dark:group-hover:text-brand-200">
            {title}
          </span>
          <span className="block truncate text-xs text-ink-500">{meta}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            badgeStrong
              ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"
              : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          }`}
        >
          {badge}
        </span>
      </Link>
    </li>
  );
}

export default async function Dashboard() {
  const user = await requireUser();
  const { owned, shared } = await listDocumentsForUser(user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-ink-500">
            Hi {user.name.split(" ")[0]}, pick up where you left off.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ImportButton />
          <NewDocumentButton />
        </div>
      </div>

      <Section
        title="My documents"
        count={owned.length}
        empty="You don't have any documents yet. Create one or import a file."
      >
        {owned.map((d) => (
          <Row
            key={d.id}
            href={`/documents/${d.id}`}
            title={d.title}
            meta={
              <>
                Edited <RelativeTime iso={d.updatedAt.toISOString()} />
              </>
            }
            badge={d.shareCount > 0 ? `Shared with ${d.shareCount}` : "Private"}
            badgeStrong={d.shareCount > 0}
          />
        ))}
      </Section>

      <Section title="Shared with me" count={shared.length} empty="Nothing has been shared with you yet.">
        {shared.map((d) => (
          <Row
            key={d.id}
            href={`/documents/${d.id}`}
            title={d.title}
            meta={
              <>
                {d.owner.name} · Edited <RelativeTime iso={d.updatedAt.toISOString()} />
              </>
            }
            badge={ROLE_LABEL[d.role]}
            badgeStrong={d.role === "EDITOR"}
          />
        ))}
      </Section>
    </main>
  );
}
