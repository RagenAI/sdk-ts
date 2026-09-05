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
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message, options);
    this.name = "RagenAuthError";
  }
}

/** 403 — authenticated but not permitted. */
export class RagenPermissionError extends RagenError {
  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message, options);
    this.name = "RagenPermissionError";
  }
}

/** 404 — resource not found. */
export class RagenNotFoundError extends RagenError {
  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message, options);
    this.name = "RagenNotFoundError";
  }
}

/** 429 — rate limit hit. Auto-retried by the client. */
export class RagenRateLimitError extends RagenError {
  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message, options);
    this.name = "RagenRateLimitError";
  }
}

/** 5xx — server-side error. Auto-retried by the client. */
export class RagenAPIError extends RagenError {
  constructor(
    message: string,
    options: {
      status: number;
      code?: string | null;
      param?: string | null;
      type?: string;
    },
  ) {
    super(message, options);
    this.name = "RagenAPIError";
  }
}

/**
 * Pull a usable message out of whatever an endpoint returned.
 *
 * The OpenAI-compatible routes all run `OpenAiExceptionFilter` and emit
 * `{ error: { message, type, code, param } }`. Ragen's native `/v1/chat`
 * does not: it returns `{ error: "<string>", code }` from the service,
 * `{ message }` (or `{ message: [...] }` from the validation pipe) via
 * Nest's global filter, and bare text from its 500 catch-all. Reading
 * only the OpenAI shape threw all three away and left the caller with
 * "request failed with status 404".
 */
function normalizeErrorBody(
  parsed: unknown,
  rawText: string,
): { message?: string; type?: string; code?: string | null; param?: string | null } {
  if (parsed && typeof parsed === "object") {
    const body = parsed as Record<string, unknown>;

    // OpenAI envelope.
    const error = body.error;
    if (error && typeof error === "object") {
      const e = error as Record<string, unknown>;
      return {
        message: typeof e.message === "string" ? e.message : undefined,
        type: typeof e.type === "string" ? e.type : undefined,
        code:
          typeof e.code === "string" || typeof e.code === "number"
            ? String(e.code)
            : null,
        param: typeof e.param === "string" ? e.param : null,
      };
    }

    // Nest's filters. `message` is an array when the validation pipe
    // rejects a body — that array is the per-field detail, so keep all
    // of it rather than showing the first violation alone.
    const message = body.message;
    if (Array.isArray(message)) {
      return { message: message.map(String).join("; ") };
    }
    if (typeof message === "string") {
      return { message };
    }

    // ChatService's own `{ error: "...", code }`.
    if (typeof error === "string") {
      return {
        message: error,
        code: typeof body.code === "number" ? String(body.code) : null,
      };
    }
  }

  // Non-JSON body (the native chat 500 sends plain text).
  const text = rawText.trim();
  return text ? { message: text } : {};
}

/**
 * Convert an HTTP error response into the appropriate `RagenError` subclass.
 *
 * @internal
 */
export function errorFromResponse(
  status: number,
  body: unknown,
  fallbackMessage: string,
  rawText = "",
): RagenError {
  const err = normalizeErrorBody(body, rawText);
  const message = err.message ?? fallbackMessage;
  const opts = {
    status,
    code: err.code ?? null,
    param: err.param ?? null,
    type: err.type ?? "api_error",
  };
  if (status === 401) {
    return new RagenAuthError(message, opts);
  }
  if (status === 403) {
    return new RagenPermissionError(message, opts);
  }
  if (status === 404) {
    return new RagenNotFoundError(message, opts);
  }
  if (status === 429) {
    return new RagenRateLimitError(message, opts);
  }
  if (status >= 500) {
    return new RagenAPIError(message, opts);
  }
  return new RagenError(message, opts);
}
