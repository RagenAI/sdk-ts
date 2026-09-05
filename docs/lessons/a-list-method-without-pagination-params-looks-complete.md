---
title: "A list() that forwards no pagination params silently returns the server default and looks complete"
modules: ["assistants", "threads", "files"]
areas: ["integration"]
topics: ["pagination", "api-contracts", "silent-truncation"]
---

# A list() that forwards no pagination params silently returns the server default and looks complete

**Context**: `assistants.list()` was written as `list(options?: { signal?: AbortSignal })` — no params argument at all. It called `GET /v1/assistants` with no query string.

**Problem**: `ListAssistantsDto` supports `limit`, `order`, `after` and `before`, and the endpoint defaults to `limit = 20`. So an organization with 25 assistants got 20 of them, with no error, no warning, and a correctly-typed `{ object: "list", data: [...] }` response. There was no way to reach the other five from the SDK at all.

Nothing about the call site suggested a problem. `const all = await ragen.assistants.list()` reads like it returns everything, the README used exactly that line, and the response envelope carries no `has_more` field that would have made the truncation visible.

Fixing it moved `options` to the second argument, matching `files.list(params, options)`. That is a **source-compatible break**: `assistants.list({ signal })` still compiles, but `signal` is now read as a list param and the abort is silently dropped. A signature change that keeps compiling is more dangerous than one that doesn't.

**Rule**: when wrapping a list endpoint, port every pagination param the DTO declares, in the `(params?, options?)` order the other resources use. Check the server's default page size and say so in the doc comment — a caller who does not know there is a limit will not pass one. Where the envelope has no `has_more`, offer an iterator that pages until a short page arrives, and test that it terminates on both a short page and an empty one.

**Applies to**: every `list()` in `src/resources/`. `files.list()` and `threads.list()` follow this shape; check any new one against its DTO rather than the response type, since the response looks identical whether or not you paged.
