import { requireUser } from "@/lib/session";
import ImportButton from "@/components/ImportButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="mt-2 text-sm text-neutral-500">Your documents will appear here.</p>
      <div className="mt-6">
        <ImportButton />
      </div>
    </main>
  );
}
