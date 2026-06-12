import { NextResponse } from "next/server";
import { z } from "zod";

export const TOKEN_SCHEMA = z.string().trim().min(1);

export function jsonOk<T>(body: T) {
  return NextResponse.json(body);
}

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(await request.json());
}

export function toErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return jsonError("Invalid request body", 400, "INVALID_BODY");
  }

  if (error instanceof Error && error.message === "Invalid player session") {
    return jsonError("Invalid player session", 401, "INVALID_SESSION");
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500;
  const message =
    error instanceof Error ? error.message : "Unexpected server error";

  return jsonError(message, status, status >= 500 ? "SERVER_ERROR" : "ERROR");
}
