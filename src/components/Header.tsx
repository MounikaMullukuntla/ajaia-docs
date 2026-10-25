import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import Avatar from "@/components/Avatar";

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-surface/80 backdrop-blur dark:border-ink-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white"
          >
            A
          </span>
          Ajaia Docs
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block font-medium">{user.name}</span>
              <span className="block text-xs text-ink-500">{user.email}</span>
            </span>
            <Avatar name={user.name} size="sm" />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-100"
              >
                Switch user
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
