import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Ajaia Docs
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span title={user.email}>{user.name}</span>
            <form action={signOut}>
              <button type="submit" className="text-neutral-500 underline-offset-4 hover:underline">
                Switch user
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
