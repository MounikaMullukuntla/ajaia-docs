import { NextResponse, type NextRequest } from "next/server";

// Cheap gate: no cookie -> /login. Pages still verify the user exists
// via requireUser(), since the edge runtime can't query the database.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("ajaia_uid")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except login, API routes (they return 401 themselves), and static assets.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\.svg$).*)"],
};
