import type {
  Assistant,
  AssistantCreateParams,
  AssistantDeletedResponse,
  AssistantListResponse,
  AssistantUpdateParams,
} from "../types";
import { performRequest, readJson, type FetchClientConfig } from "../utils";

export type {
  Assistant,
  AssistantCreateParams,
  AssistantDeletedResponse,
  AssistantListResponse,
  AssistantUpdateParams,
} from "../types";

interface AssistantsResourceConfig {
  http: FetchClientConfig;
}

/** `assistants` resource — manage Ragen projects (a.k.a. assistants). */
export class Assistants {
  constructor(private readonly config: AssistantsResourceConfig) {}

  /** Create a new assistant. */
  async create(
    params: AssistantCreateParams,
    options?: { signal?: AbortSignal },
  ): Promise<Assistant> {
    const response = await performRequest(this.config.http, {
      method: "POST",
      path: "/assistants",
      body: params,
      signal: options?.signal,
    });
    return readJson<Assistant>(response);
  }

  /** List all assistants in the organization. */
  async list(options?: { signal?: AbortSignal }): Promise<AssistantListResponse> {
    const response = await performRequest(this.config.http, {
      method: "GET",
      path: "/assistants",
      signal: options?.signal,
    });
    return readJson<AssistantListResponse>(response);
  }

  /** Retrieve a single assistant by ID. */
  async retrieve(id: string, options?: { signal?: AbortSignal }): Promise<Assistant> {
    const response = await performRequest(this.config.http, {
      method: "GET",
      path: `/assistants/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
    return readJson<Assistant>(response);
  }

  /** Update an assistant. Sends `POST` to match OpenAI's wire format. */
  async update(
    id: string,
    params: AssistantUpdateParams,
    options?: { signal?: AbortSignal },
  ): Promise<Assistant> {
    const response = await performRequest(this.config.http, {
      method: "POST",
      path: `/assistants/${encodeURIComponent(id)}`,
      body: params,
      signal: options?.signal,
    });
    return readJson<Assistant>(response);
  }

  /** Delete an assistant. */
  async delete(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<AssistantDeletedResponse> {
    const response = await performRequest(this.config.http, {
      method: "DELETE",
      path: `/assistants/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
    return readJson<AssistantDeletedResponse>(response);
  }
}
