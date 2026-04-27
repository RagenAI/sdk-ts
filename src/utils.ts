import { errorFromResponse, RagenError } from "./errors";
import type { APIErrorBody } from "./types";

export interface RequestOptions {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** When set, body is sent as `multipart/form-data`. */
  formData?: FormData;
  /** When true, returns the raw `Response` (used for streaming). */
  raw?: boolean;
  /** Per-request signal. */
  signal?: AbortSignal;
}

export interface FetchClientConfig {
  apiKey: string;
  baseURL: string;
  maxRetries: number;
  timeout: number;
  fetch: typeof fetch;
}

/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with full jitter. */
export function backoffDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  return Math.floor(Math.random() * base);
}

function buildUrl(
  baseURL: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const trimmedBase = baseURL.replace(/\/$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${trimmedBase}${trimmedPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Perform an HTTP request against the Ragen API, with auto-retry on 429/5xx
 * and consistent error mapping.
 */
export async function performRequest(
  config: FetchClientConfig,
  options: RequestOptions,
): Promise<Response> {
  const url = buildUrl(config.baseURL, options.path, options.query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
    "User-Agent": "@ragenai/sdk",
  };

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
    // Let fetch set the multipart boundary.
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let lastError: unknown;
  const maxAttempts = config.maxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const onAbort = (): void => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        throw new RagenError("Request aborted", { status: 0, type: "abort" });
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const response = await config.fetch(url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok && isRetryable(response.status) && attempt < maxAttempts - 1) {
        // Drain the body so the connection can be reused.
        await response.text().catch(() => undefined);
        await sleep(backoffDelay(attempt));
        continue;
      }

      if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        throw errorFromResponse(
          response.status,
          errorBody,
          `Ragen API request failed with status ${response.status}`,
        );
      }

      return response;
    } catch (err) {
      lastError = err;
      // Network errors / aborts → retry while attempts remain.
      if (err instanceof RagenError) throw err;
      if (attempt < maxAttempts - 1) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new RagenError("Request timed out", {
          status: 0,
          type: "timeout",
        });
      }
      throw new RagenError(
        err instanceof Error ? err.message : "Network request failed",
        { status: 0, type: "network_error" },
      );
    } finally {
      clearTimeout(timeoutId);
      if (options.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
    }
  }

  throw (
    lastError ??
    new RagenError("Request failed after retries", { status: 0, type: "api_error" })
  );
}

async function parseErrorBody(response: Response): Promise<APIErrorBody | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as APIErrorBody;
  } catch {
    return null;
  }
}

/** Parse a JSON response body, throwing a `RagenError` on malformed JSON. */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RagenError("Failed to parse JSON response", {
      status: response.status,
      type: "api_error",
    });
  }
}
