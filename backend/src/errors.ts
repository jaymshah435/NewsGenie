// Errors that become JSON responses like {"detail": "..."}.

import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Checks input with a zod schema; bad input becomes a readable 422 error. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    throw new HttpError(422, field ? `${field}: ${issue.message}` : issue.message);
  }
  return result.data;
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ detail: "Not found." });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ detail: err.message });
  } else if (err?.type === "entity.parse.failed") {
    res.status(400).json({ detail: "The request body is not valid JSON." });
  } else {
    console.error(err);
    res.status(500).json({ detail: "Something went wrong on the server." });
  }
};
