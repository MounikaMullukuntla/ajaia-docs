import "server-only";
import { prisma } from "@/lib/db";
import { getRole, PERMISSIONS, type Role } from "@/lib/access";

// Loads a document only if the user can see it. Returns null for both
// "doesn't exist" and "no access", so callers can treat them the same (404).
// `role` and `permissions` tell the UI and API what this user may do.
export async function getDocumentForUser(userId: string, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: {
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!document) return null;

  const role: Role | null = getRole(userId, document);
  if (!role) return null;

  return { document, role, permissions: PERMISSIONS[role] };
}
