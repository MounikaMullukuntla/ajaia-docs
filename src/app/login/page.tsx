import { prisma } from "@/lib/db";
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
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Demo app: pick a seeded account. Switch accounts to try sharing.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          That account could not be found. Please pick one below.
        </p>
      )}

      {users.length === 0 ? (
        <p className="mt-6 text-sm">
          No users yet. Run <code className="font-mono">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <form action={signIn}>
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-left hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <span className="block font-medium">{u.name}</span>
                  <span className="block text-sm text-neutral-500">{u.email}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
