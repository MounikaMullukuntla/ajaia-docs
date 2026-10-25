import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { requireUser } from "@/lib/session";
import { getDocumentForUser } from "@/lib/documents";
import DocumentEditor from "@/components/editor/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const result = await getDocumentForUser(user.id, (await params).id);
  // Missing and no-access look the same, matching the API's 404.
  if (!result) notFound();

  const { document, role, permissions } = result;

  return (
    <DocumentEditor
      doc={{
        id: document.id,
        title: document.title,
        content: document.content as JSONContent,
        updatedAt: document.updatedAt.toISOString(),
        owner: document.owner,
      }}
      role={role}
      permissions={[...permissions]}
      initialShares={document.shares.map((s) => ({ role: s.role, user: s.user }))}
    />
  );
}
