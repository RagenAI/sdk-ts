import { vi } from "vitest";

export interface MockResponseInit {
  status?: number;
  body?: unknown;
  /** Raw body (string or stream). Takes precedence over `body`. */
  raw?: string | ReadableStream<Uint8Array>;
  headers?: Record<string, string>;
}

export function mockResponse(init: MockResponseInit = {}): Response {
  const { status = 200, body, raw, headers = {} } = init;
  if (raw !== undefined) {
    if (typeof raw === "string") {
      return new Response(raw, {
        status,
        headers: { "Content-Type": "text/event-stream", ...headers },
      });
    }
    return new Response(raw, {
      status,
      headers: { "Content-Type": "text/event-stream", ...headers },
    });
  }
  const json = body === undefined ? "" : JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export interface RecordedCall {
  url: string;
  init: RequestInit;
}

export function makeFetchMock(
  responses: Array<Response | (() => Response | Promise<Response>)>,
): { fetch: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  let i = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init: init ?? {} });
    const next = responses[i++];
    if (!next) throw new Error(`Unexpected fetch call #${i} to ${url}`);
    return typeof next === "function" ? await next() : next;
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

export function sseStream(events: string[]): string {
  return events.map((e) => `${e}\n\n`).join("");
}
