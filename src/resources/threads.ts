import type { Thread, ThreadListParams, ThreadListResponse } from "../types";
import { performRequest, readJson, type FetchClientConfig } from "../utils";

export type { Thread, ThreadListParams, ThreadListResponse } from "../types";

interface ThreadsResourceConfig {
  http: FetchClientConfig;
}

/**
 * `threads` resource — deliberately just `list()`.
 *
 * Thread and message CRUD on `/v1/threads` follows the OpenAI Assistants
 * API, so the official OpenAI SDK already speaks it against a Ragen base
 * URL and there's nothing for us to add. `GET /v1/threads` is the
 * exception: listing threads isn't in the OpenAI spec, so no OpenAI SDK
 * exposes it, and this is the only way to reach it.
 *
 * Threads are org-scoped, not scoped to the API key's project.
 */
export class Threads {
  constructor(private readonly config: ThreadsResourceConfig) {}

  /**
   * List threads in the organization.
   *
   * Note the server-side default of 20 — pass `limit` to page wider, and
   * `after` (a thread id) to continue.
   */
  async list(
    params: ThreadListParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<ThreadListResponse> {
    const response = await performRequest(this.config.http, {
      method: "GET",
      path: "/threads",
      query: {
        limit: params.limit,
        order: params.order,
        after: params.after,
      },
      signal: options?.signal,
    });
    return readJson<ThreadListResponse>(response);
  }

  /**
   * Walk every page of `list()`, yielding one thread at a time.
   *
   * The API returns a bare `{ object, data }` envelope with no
   * `has_more`, so termination is "a short page ends it".
   */
  async *iterate(
    params: Omit<ThreadListParams, "after"> = {},
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<Thread, void, void> {
    const limit = params.limit ?? 100;
    let after: string | undefined;

    while (true) {
      const page = await this.list({ ...params, limit, after }, options);
      for (const thread of page.data) {
        yield thread;
      }
      if (page.data.length < limit) {
        return;
      }
      after = page.data[page.data.length - 1]?.id;
      if (!after) {
        return;
      }
    }
  }
}
