import Link from "next/link";

export default function DocumentNotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Document not found</h1>
      <p className="mt-2 text-sm text-ink-500">
        It may have been deleted, or it hasn&apos;t been shared with you.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
        Back to your documents
      </Link>
    </main>
  );
}
