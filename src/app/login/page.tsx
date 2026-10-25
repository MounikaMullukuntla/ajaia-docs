import { prisma } from "@/lib/db";
import Avatar from "@/components/Avatar";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center px-4 pt-16 sm:pt-24">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Ajaia Docs</h1>
          <p className="mt-2 text-sm text-ink-500">
            Choose a demo account to continue. Switch accounts any time to try sharing.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            That account could not be found. Please pick one below.
          </p>
        )}

        <div className="mt-8 rounded-xl border border-ink-200 bg-surface p-2 shadow-sm dark:border-ink-800">
          {users.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-500">
              No users yet. Run <code className="font-mono">npm run db:seed</code>.
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={u.id}>
                  <form action={signIn}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50 dark:hover:bg-ink-800"
                    >
                      <Avatar name={u.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{u.name}</span>
                        <span className="block truncate text-sm text-ink-500">{u.email}</span>
                      </span>
                      <span aria-hidden className="text-ink-300 transition-colors group-hover:text-brand-600">
                        →
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink-400">Demo sign-in: no password needed.</p>
      </div>
    </main>
  );
}
