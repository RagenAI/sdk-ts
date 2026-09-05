---
title: "A param the server DTO does not declare rejects the whole request — the SDK cannot be permissive about what it sends"
modules: ["types", "chat", "assistants"]
areas: ["integration"]
topics: ["api-contracts", "validation", "type-safety"]
---

# A param the server DTO does not declare rejects the whole request — the SDK cannot be permissive about what it sends

**Context**: `src/types.ts` declared `name?: string` on `ChatCompletionMessageParam`, copying OpenAI's message shape. `buildBody` forwards `params.messages` verbatim, so the field went straight onto the wire.

**Problem**: `apps/api` runs a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`. An undeclared property does not get stripped or ignored — it rejects the **entire request** with a 400. `ChatMessageDto` declared only `role` and `content`, so any caller who used the `name` field the SDK's own types advertised got a failed request.

The same trap sat on the request body itself. `CreateChatCompletionDto` declared seven fields, so `top_p`, `stop`, `seed`, `presence_penalty`, `n` and the rest of the ordinary OpenAI parameter set were 400s against an endpoint documented as OpenAI-compatible.

This inverts the assumption most HTTP clients are written under, where an extra field is at worst ignored. Here it is fatal, and it fails at runtime with a server message — types and tests both pass.

**Rule**: every field this SDK can put on the wire must exist in the corresponding `apps/api` DTO. Read the DTO — `apps/api/src/<resource>/dto/*.dto.ts` — not the docs page, which has drifted before. Two consequences for how requests are built:

1. Build bodies **additively**, never by spreading the caller's object. Omit an unset optional field entirely rather than sending `undefined`, and test that the serialized body has exactly the expected keys.
2. If a field belongs in the SDK but the DTO lacks it, the fix is a server change first. Shipping the type alone guarantees a 400.

**Applies to**: every param type in `src/types.ts` and every body builder in `src/resources/`. Query params too — `ListFilesDto` validates `purpose` against a fixed set, so a free-form `string` type there is a runtime 400 waiting to happen rather than a compile error.
