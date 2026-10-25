// Role-based access control for documents. Pure functions (no database) so they are
// easy to test and every page and API route applies the same rules.
//
// Roles are per document:
// - owner:  the user who created it (Document.ownerId)
// - editor: shared with role EDITOR
// - viewer: shared with role VIEWER
// Anyone else has no access; callers respond 404 so they don't reveal the doc exists.

export type ShareRole = "VIEWER" | "EDITOR";
export type Role = "owner" | "editor" | "viewer";
export type Action = "view" | "edit" | "share" | "delete";

// Single source of truth for what each role may do.
export const PERMISSIONS: Record<Role, readonly Action[]> = {
  owner: ["view", "edit", "share", "delete"],
  editor: ["view", "edit"],
  viewer: ["view"],
};

export type DocumentAccessInfo = {
  ownerId: string;
  shares: { userId: string; role: ShareRole }[];
};

export function getRole(userId: string | null | undefined, doc: DocumentAccessInfo): Role | null {
  if (!userId) return null;
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return null;
  return share.role === "EDITOR" ? "editor" : "viewer";
}

export function can(
  userId: string | null | undefined,
  doc: DocumentAccessInfo,
  action: Action,
): boolean {
  const role = getRole(userId, doc);
  return role !== null && PERMISSIONS[role].includes(action);
}

export const canView = (userId: string | null | undefined, doc: DocumentAccessInfo) =>
  can(userId, doc, "view");
export const canEdit = (userId: string | null | undefined, doc: DocumentAccessInfo) =>
  can(userId, doc, "edit");
export const canShare = (userId: string | null | undefined, doc: DocumentAccessInfo) =>
  can(userId, doc, "share");
export const canDelete = (userId: string | null | undefined, doc: DocumentAccessInfo) =>
  can(userId, doc, "delete");
