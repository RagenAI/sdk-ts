# Changelog

All notable changes to `@ragenai/sdk` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- `models.list()` and `models.retrieve()`.
- `assistants` CRUD (`create`, `list`, `retrieve`, `update`, `delete`).
- Typed error hierarchy: `RagenError`, `RagenAuthError`,
  `RagenPermissionError`, `RagenNotFoundError`, `RagenRateLimitError`,
  `RagenAPIError`.
- Auto-retry on 429 and 5xx with exponential backoff + jitter.
- Per-request `AbortSignal` support and configurable timeout.
- Dual ESM + CJS build via `tsup`, with `.d.ts` types.
