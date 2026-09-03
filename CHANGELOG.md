# Changelog

All notable changes to `@ragenai/sdk` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `chat.send()`, `chat.sendStream()` and `chat.sendToString()` for
  Ragen's native `POST /v1/chat`. This endpoint accepts `context` (extra
  page/document text for embedded chatbots) and separates the model's
  reasoning deltas from the answer — neither has an equivalent on
  `/v1/chat/completions`, so both were previously unreachable from the
  SDK. `sendStream()` yields discriminated `{ type: "text" | "reasoning" }`
  events.
- `threads.list()` and `threads.iterate()`. Listing threads is not part
  of the OpenAI spec, so no OpenAI SDK exposes it. The rest of thread and
  message CRUD is OpenAI-compatible and deliberately left to the OpenAI
  SDK rather than duplicated here.
- `reasoning_effort` and `max_completion_tokens` on
  `chat.completions.create()` / `.stream()`. Requires an API that accepts
  them — see the matching `fix(api)` change.
- Pagination on `assistants.list()`: `limit`, `order`, `after`, `before`.
  Without them the call silently returned only the first 20 assistants.
- `Thread`, `ThreadListParams`, `ThreadListResponse`, `ChatSendParams`,
  `ChatSendResponse`, `ChatStreamEvent`, `ReasoningEffort`,
  `FilePurpose` and `AssistantListParams` type exports.

### Changed

- **Breaking**: `assistants.list()` now takes `(params?, options?)`
  instead of `(options?)`, matching `files.list()`. A call written as
  `assistants.list({ signal })` now reads `signal` as a list param and
  drops it — move it to the second argument.
- `Assistant` now types every field the API actually returns
  (`description`, `model`, `tools`, `tool_resources`, `metadata`,
  `temperature`, `top_p`, `response_format`); previously only five of
  thirteen were declared.
- `AssistantCreateParams` / `AssistantUpdateParams` accept the fields the
  API tolerates: `description`, `model`, `temperature`, `metadata`,
  `top_p`.
- `FileListParams.purpose` narrowed from `string` to
  `"knowledge_base" | "assistants"` — the API 400s on anything else, so
  a typo is now a compile error instead of a runtime failure.
- `parseSSEStream()` is generic over its payload, since `/v1/chat` and
  `/v1/chat/completions` stream different shapes.

### Fixed

- Removed a changelog entry for `models.list()` / `models.retrieve()`.
  No such resource ships in this SDK, and the API has no `/v1/models`
  endpoint.

## [0.1.0] — Unreleased

### Added

- Initial release of the `@ragenai/sdk` TypeScript client.
- `chat.completions.create()` (non-streaming and streaming) with full
  type-safe support for OpenAI-compatible parameters plus Ragen's
  `assistantId`.
- `chat.completions.stream()` and `chat.completions.streamToString()`
  convenience helpers backed by an SSE async iterator.
- `files` resource: `upload`, `list`, `retrieve`, `delete`,
  `waitUntilProcessed`, and `uploadAndWait`.
- `assistants` CRUD (`create`, `list`, `retrieve`, `update`, `delete`).
- Typed error hierarchy: `RagenError`, `RagenAuthError`,
  `RagenPermissionError`, `RagenNotFoundError`, `RagenRateLimitError`,
  `RagenAPIError`.
- Auto-retry on 429 and 5xx with exponential backoff + jitter.
- Per-request `AbortSignal` support and configurable timeout.
- Dual ESM + CJS build via `tsup`, with `.d.ts` types.
