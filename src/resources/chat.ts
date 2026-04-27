import { RagenError } from "../errors";
import { parseSSEStream } from "../streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsBase,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionStreamParams,
} from "../types";
import { performRequest, readJson, type FetchClientConfig } from "../utils";

export type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionStreamParams,
} from "../types";

interface ChatResourceConfig {
  http: FetchClientConfig;
  defaultAssistantId?: string;
}

function buildBody(
  params: ChatCompletionCreateParamsBase,
  defaultAssistantId: string | undefined,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  const assistantId = params.assistantId ?? defaultAssistantId;
  if (!assistantId) {
    throw new RagenError("assistantId is required (pass per-call or set on the client)", {
      status: 0,
      type: "invalid_request_error",
      param: "assistantId",
    });
  }
  const body: Record<string, unknown> = {
    assistant_id: assistantId,
    messages: params.messages,
    ...extras,
  };
  if (params.model !== undefined) body.model = params.model;
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.max_tokens !== undefined) body.max_tokens = params.max_tokens;
  return body;
}

/** `chat.completions` resource — OpenAI-compatible chat completions over Ragen's RAG. */
export class ChatCompletions {
  constructor(private readonly config: ChatResourceConfig) {}

  /**
   * Create a chat completion.
   *
   * Overload: `stream: true` returns an `AsyncIterable<ChatCompletionChunk>`,
   * otherwise returns a `ChatCompletion`.
   */
  create(
    params: ChatCompletionCreateParamsNonStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletion>;
  create(
    params: ChatCompletionCreateParamsStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
    if (params.stream === true) {
      return this.streamInternal(params, options);
    }
    const body = buildBody(params, this.config.defaultAssistantId, { stream: false });
    const response = await performRequest(this.config.http, {
      method: "POST",
      path: "/chat/completions",
      body,
      signal: options?.signal,
    });
    return readJson<ChatCompletion>(response);
  }

  /**
   * Open a streaming chat completion. Always returns an
   * `AsyncIterable<ChatCompletionChunk>`.
   */
  stream(
    params: ChatCompletionStreamParams,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<ChatCompletionChunk> {
    const streamParams: ChatCompletionCreateParamsStreaming = {
      ...params,
      stream: true,
    };
    const open = (): Promise<AsyncIterable<ChatCompletionChunk>> =>
      this.streamInternal(streamParams, options);

    async function* generate(): AsyncGenerator<ChatCompletionChunk, void, void> {
      const iterable = await open();
      for await (const chunk of iterable) yield chunk;
    }

    return { [Symbol.asyncIterator]: () => generate() };
  }

  /**
   * Convenience: consume a streaming completion and return the concatenated
   * assistant content as a single string.
   */
  async streamToString(
    params: ChatCompletionStreamParams,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    const iter = this.stream(params, options);
    let out = "";
    for await (const chunk of iter) {
      const piece = chunk.choices[0]?.delta?.content;
      if (piece) out += piece;
    }
    return out;
  }

  private async streamInternal(
    params: ChatCompletionCreateParamsStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    const extras: Record<string, unknown> = { stream: true };
    if (params.stream_options) extras.stream_options = params.stream_options;
    const body = buildBody(params, this.config.defaultAssistantId, extras);
    const response = await performRequest(this.config.http, {
      method: "POST",
      path: "/chat/completions",
      body,
      raw: true,
      signal: options?.signal,
    });
    return parseSSEStream(response);
  }
}

/** Namespace wrapper so the call site reads `client.chat.completions.create(...)`. */
export class Chat {
  readonly completions: ChatCompletions;

  constructor(config: ChatResourceConfig) {
    this.completions = new ChatCompletions(config);
  }
}
