/**
 * @ragenai/sdk — Official TypeScript SDK for Ragen.ai
 *
 * EU-native, GDPR-compliant RAG platform with an OpenAI-compatible wire format.
 */

export { Ragen } from "./client";
export type { RagenClientOptions } from "./client";

export { Chat, ChatCompletions } from "./resources/chat";
export type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionStreamParams,
} from "./resources/chat";

export { Files } from "./resources/files";
export type { UploadFileInput } from "./resources/files";
export type {
  FileDeletedResponse,
  FileListParams,
  FileListResponse,
  FileObject,
  FileStatus,
  FileUploadParams,
  WaitUntilProcessedOptions,
} from "./resources/files";

export { Assistants } from "./resources/assistants";
export type {
  Assistant,
  AssistantCreateParams,
  AssistantDeletedResponse,
  AssistantListResponse,
  AssistantUpdateParams,
} from "./resources/assistants";

export {
  RagenError,
  RagenAuthError,
  RagenPermissionError,
  RagenNotFoundError,
  RagenRateLimitError,
  RagenAPIError,
} from "./errors";

export type {
  ChatCompletionRole,
  ChatCompletionUsage,
  ChatCompletionStreamOptions,
  APIErrorBody,
} from "./types";

// Default export so `import Ragen from "@ragenai/sdk"` also works.
export { Ragen as default } from "./client";
