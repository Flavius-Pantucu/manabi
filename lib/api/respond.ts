/**
 * One error shape for every route.
 *
 * Handlers throw; `route` catches. The alternative — each handler returning
 * `NextResponse.json({error}, {status})` by hand — is how a codebase ends up
 * with four spellings of "unauthorized" and a stack trace in a production
 * response body.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (m: string, d?: unknown) =>
  new ApiError(400, "bad_request", m, d);
export const notFound = (m = "Not found.") => new ApiError(404, "not_found", m);
export const conflict = (m: string) => new ApiError(409, "conflict", m);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/**
 * Wrap a handler so thrown errors become responses.
 *
 * Zod failures are reported field by field because these endpoints are what
 * the client's forms talk to, and "expected string, received number" without
 * a path is not actionable.
 */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.code, message: err.message, details: err.details },
          { status: err.status },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: "invalid_request",
            message: "Some fields were not accepted.",
            details: err.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      // Never leak the message: it may carry a connection string or a query.
      console.error("unhandled route error", err);
      return NextResponse.json(
        { error: "internal", message: "Something went wrong." },
        { status: 500 },
      );
    }
  };
}

/** Parse a JSON body, failing with a 400 rather than a 500 on malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Expected a JSON body.");
  }
}
