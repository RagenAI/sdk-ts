---
title: "An endpoint without OpenAiExceptionFilter does not return the OpenAI error envelope, and the status code hides it"
modules: ["chat", "errors"]
areas: ["integration"]
topics: ["error-handling", "api-contracts", "native-chat", "testing"]
---

# An endpoint without OpenAiExceptionFilter does not return the OpenAI error envelope, and the status code hides it

**Context**: adding `chat.send()` / `sendStream()` / `sendToString()` for Ragen's native `POST /v1/chat`. `src/utils.ts` already had a working `parseErrorBody`, and every existing resource used it happily, so the new resource reused it without question.

**Problem**: `/v1/chat` is the one public route whose controller does **not** carry `@UseFilters(OpenAiExceptionFilter)`. It never produces `{ error: { message, type, code, param } }`. It answers three other ways instead: `{ error: "Assistant not found", code: 404 }` from `ChatService` — where `error` is a _string_, not an object — `{ message }` (an array when the validation pipe rejects a body) from Nest's global `ApiExceptionFilter`, and bare text from its 500 catch-all.

`errorFromResponse` read only `body.error.message`, which is `undefined` for all three. Every failure reached the caller as `"Ragen API request failed with status 404"`.

What made it easy to miss: **error-class selection is driven by the status code, not the body**. A 404 was still correctly a `RagenNotFoundError` and a 429 still a `RagenRateLimitError`, so tests asserting `rejects.toBeInstanceOf(...)` passed while the message was gone. The two cases that lost their message — assistant not found, monthly limit exceeded — are exactly the two a caller most needs to read.

It was found by reading a _different_ client: `apps/mcp` in the platform repo hand-rolls a fetch client against the same endpoint and parses these shapes defensively, with a comment recording that it hit the inconsistency live when the token vault was unreachable.

**Rule**: before wrapping an endpoint, open its controller and check which exception filter it runs under. `@UseFilters(OpenAiExceptionFilter)` means the OpenAI envelope; its absence means Nest's global filter and whatever the service writes by hand. Normalize every shape in `src/errors.ts` — OpenAI envelope first so the compatible routes keep precedence — never per resource. In tests, assert on the error **message**, not only the subclass: the status alone will pick the right class even when the body was dropped entirely.

**Applies to**: every resource in `src/resources/`. Today `POST /v1/chat` is the only public route without the filter, but that is a property of each controller, not a global guarantee — re-check per endpoint rather than assuming.
