/**
 * Shared types used across the SDK. Mirrors Ragen.ai's OpenAI-compatible
 * wire format, with Ragen-specific fields (e.g. `assistant_id`) lifted into
 * first-class citizens.
 */

export type ChatCompletionRole = "system" | "user" | "assistant";

export interface ChatCompletionMessageParam {
  role: ChatCompletionRole;
  content: string;
  name?: string;
}

export interface ChatCompletionMessage {
  role: "assistant";
  content: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: "stop" | "length" | "content_filter" | "tool_calls" | null;
  logprobs: unknown | null;
}

export interface ChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

export interface ChatCompletionChunkDelta {
  role?: ChatCompletionRole;
  content?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: "stop" | "length" | "content_filter" | "tool_calls" | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: ChatCompletionUsage;
}

export interface ChatCompletionStreamOptions {
  include_usage?: boolean;
}

export interface ChatCompletionCreateParamsBase {
  /** Required if no default `assistantId` is set on the client. */
  assistantId?: string;
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionCreateParamsNonStreaming extends ChatCompletionCreateParamsBase {
  stream?: false;
}

export interface ChatCompletionCreateParamsStreaming extends ChatCompletionCreateParamsBase {
  stream: true;
  stream_options?: ChatCompletionStreamOptions;
}

export type ChatCompletionCreateParams =
  | ChatCompletionCreateParamsNonStreaming
  | ChatCompletionCreateParamsStreaming;

export interface ChatCompletionStreamParams extends ChatCompletionCreateParamsBase {
  stream_options?: ChatCompletionStreamOptions;
}

// --- Files -----------------------------------------------------------------

export type FileStatus = "uploaded" | "processed" | "error";

export interface FileObject {
  id: string;
  object: "file";
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: FileStatus;
  status_details: string | null;
}

export interface FileListParams {
  limit?: number;
  after?: string;
  purpose?: string;
}

export interface FileListResponse {
  object: "list";
  data: FileObject[];
}

export interface FileUploadParams {
  filename?: string;
  purpose?: "knowledge_base" | "assistants";
}

export interface FileDeletedResponse {
  id: string;
  object: "file";
  deleted: true;
}

export interface WaitUntilProcessedOptions {
  /** Maximum total wait, ms. Default 300_000 (5 minutes). */
  timeout?: number;
  /** Initial poll interval, ms. Default 1_000. */
  pollInterval?: number;
  /** Maximum poll interval, ms. Default 10_000. */
  maxPollInterval?: number;
}

// --- Assistants ------------------------------------------------------------

export interface Assistant {
  id: string;
  object: "assistant";
  created_at: number;
  name: string;
  instructions: string | null;
}

export interface AssistantCreateParams {
  name: string;
  instructions?: string;
}

export interface AssistantUpdateParams {
  name?: string;
  instructions?: string;
}

export interface AssistantListResponse {
  object: "list";
  data: Assistant[];
}

export interface AssistantDeletedResponse {
  id: string;
  object: "assistant.deleted";
  deleted: true;
}

// --- Error envelope --------------------------------------------------------

export interface APIErrorBody {
  error: {
    message: string;
    type: string;
    code: string | null;
    param: string | null;
  };
}
