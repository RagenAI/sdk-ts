import type { APIErrorBody } from "./types";

/** Base error class for all Ragen SDK errors. */
export class RagenError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly param: string | null;
  readonly type: string;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message);
    this.name = "RagenError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.param = options.param ?? null;
    this.type = options.type ?? "api_error";
  }
}

/** 401 — invalid or missing API key. */
export class RagenAuthError extends RagenError {
  constructor(
    message: string,
    options: { status: number; code?: string | null; param?: string | null; type?: string },
  ) {
    super(message, options);
    this.name = "RagenAuthError";
  }
}

/** 403 — authenticated but not permitted. */
export class RagenPermissionError extends RagenError {
  constructor(
    message: string,
    options: { status: number; code?: string | null; param?: string | null; type?: string },
  ) {
    super(message, options);
    this.name = "RagenPermissionError";
  }
}

/** 404 — resource not found. */
export class RagenNotFoundError extends RagenError {
  constructor(
    message: string,
    options: { status: number; code?: string | null; param?: string | null; type?: string },
  ) {
    super(message, options);
    this.name = "RagenNotFoundError";
  }
}

/** 429 — rate limit hit. Auto-retried by the client. */
export class RagenRateLimitError extends RagenError {
  constructor(
    message: string,
    options: { status: number; code?: string | null; param?: string | null; type?: string },
  ) {
    super(message, options);
    this.name = "RagenRateLimitError";
  }
}

/** 5xx — server-side error. Auto-retried by the client. */
export class RagenAPIError extends RagenError {
  constructor(
    message: string,
    options: { status: number; code?: string | null; param?: string | null; type?: string },
  ) {
    super(message, options);
    this.name = "RagenAPIError";
  }
}

/**
 * Convert an HTTP error response into the appropriate `RagenError` subclass.
 *
 * @internal
 */
export function errorFromResponse(
  status: number,
  body: APIErrorBody | null,
  fallbackMessage: string,
): RagenError {
  const err = body?.error;
  const message = err?.message ?? fallbackMessage;
  const opts = {
    status,
    code: err?.code ?? null,
    param: err?.param ?? null,
    type: err?.type ?? "api_error",
  };
  if (status === 401) return new RagenAuthError(message, opts);
  if (status === 403) return new RagenPermissionError(message, opts);
  if (status === 404) return new RagenNotFoundError(message, opts);
  if (status === 429) return new RagenRateLimitError(message, opts);
  if (status >= 500) return new RagenAPIError(message, opts);
  return new RagenError(message, opts);
}
