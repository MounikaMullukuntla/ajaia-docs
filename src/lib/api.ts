import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/session";

// Small helpers so every route returns errors in the same shape: { error: string }.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new ApiError(404, "Document not found");
export const forbidden = (message = "You don't have permission to do that") =>
  new ApiError(403, message);

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Please sign in");
  return user;
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid input");
  return result.data;
}

// Wraps a route handler: known errors become JSON responses, anything else is a logged 500.
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
