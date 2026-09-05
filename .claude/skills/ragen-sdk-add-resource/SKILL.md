---
name: ragen-sdk-add-resource
description: Add a resource, method, or request param to the SDK — in the order that catches the server's constraints before they become runtime 400s. Use when wrapping a new endpoint, adding a method to an existing resource, or forwarding a new parameter. Triggers on "add endpoint", "wrap this route", "new resource", "dodaj endpoint do SDK".
---

# Adding a resource, method, or param

The server rejects more than a typical HTTP API does, and the wire format is not type-checked from here. Doing these steps out of order produces code that compiles, passes tests, and 400s in production.

## 0. Decide whether it belongs here at all

Read [`docs/api-surface.md`](../../../docs/api-surface.md).

Ragen's API is OpenAI-compatible, so the official OpenAI SDK already handles the spec-shaped parts. Wrapping one of those adds surface to keep in sync forever and buys the user nothing. Ask what an OpenAI-SDK user cannot do today:

- **Unreachable at all** (a Ragen-only endpoint or param) → wrap it.
- **Reachable only via `extra_body` / `@ts-expect-error`** → judgement call; say so explicitly in the PR.
- **Plain OpenAI spec** → don't. Record the decision instead.

When threads were audited, one of ten routes cleared this bar.

## 1. Read the server before writing anything

In the `apps/api` workspace of [`WebAmigos/ragen`](https://github.com/WebAmigos/ragen), for the resource you're wrapping:

```bash
cat apps/api/src/<resource>/<resource>.controller.ts   # routes, guards, filters
cat apps/api/src/<resource>/dto/*.dto.ts               # what it actually accepts
cat apps/api/src/<resource>/*.mapper.ts                # what it actually returns
```

Three things to extract, all of which change the code you write:

1. **The exact accepted fields.** The global pipe runs `forbidNonWhitelisted`, so a field the DTO doesn't declare rejects the whole request with a 400. Not ignored — rejected. The DTO is the list; the docs page is not.
2. **Validators, not just types.** `@IsIn(['knowledge_base', 'assistants'])` on a string means the SDK type should be that union, so a typo fails at compile time instead of at runtime.
3. **Which exception filter the controller runs.** `@UseFilters(OpenAiExceptionFilter)` → the OpenAI error envelope. Without it, errors come back in other shapes and `src/errors.ts` needs a branch. See `docs/lessons/an-endpoint-without-the-openai-filter-answers-in-four-shapes.md`.

If you cannot read that repo, ask the user. A guessed field name is a runtime failure, not a type error.

## 2. Types in `src/types.ts`

Params and response shapes go here, not in the resource file; the resource re-exports them. Match the mapper field for field — under-typing hides data that is already arriving.

Name wire fields exactly as the server does (snake_case). Reserve camelCase for SDK-only options like `assistantId`.

## 3. The resource in `src/resources/`

Resources are thin HTTP wrappers. Retries, timeouts and auth live in `utils.ts`; don't reimplement them.

Build request bodies **additively**:

```ts
const body: Record<string, unknown> = {
  assistant_id: assistantId,
  content: params.content,
};
if (params.context !== undefined) {
  body.context = params.context;
}
```

Never spread the caller's object onto the wire — that is how an undeclared field reaches a `forbidNonWhitelisted` pipe. Omit unset optionals rather than sending `undefined`.

For streaming, use the generic parser in `src/streaming.ts`. It is generic because `/v1/chat/completions` and `/v1/chat` stream different payloads; add a type argument, don't write a second parser. If a stream carries more than one kind of event, yield a discriminated union rather than making callers probe for keys — reasoning deltas concatenated into answer text is the failure that shape prevents.

## 4. Wire it up

- `src/client.ts` — construct it in the `Ragen` constructor and expose a readonly field.
- `src/index.ts` — export the class and its types. **This file is the public API contract.**

Watch for signature changes that keep compiling. `list(options)` → `list(params, options)` silently reinterprets an existing caller's argument; that is breaking even though nothing fails to build.

## 5. Tests in `tests/`

One file per resource, using `makeFetchMock` from `tests/helpers.ts`. Cover:

- URL, method, and the exact serialized body or query string;
- response parsing, including any Ragen extension fields;
- **that unset optionals are absent from the body** — assert on `Object.keys(body)`, not just on the fields you set. Given `forbidNonWhitelisted`, this is a real regression test;
- errors: assert the **message**, not only the subclass. Status alone picks the right class even when the body was dropped;
- streaming: event order and termination on `[DONE]`;
- pagination: params reach the query string, and any iterator terminates on a short page and an empty one.

## 6. The documents that are contracts

- `CHANGELOG.md` — under `[Unreleased]`, with **Breaking** called out explicitly for a signature change that still compiles.
- `README.md` — if a user would call it.
- `docs/api-surface.md` — if coverage changed. Update the table and, for a Ragen-only feature, say what makes it unreachable from the OpenAI SDK.
- `docs/lessons.md` — if the server surprised you.

## 7. Gate

```bash
pnpm verify
```

Type-check, lint, test, build — the same four CI runs. `pnpm test` alone passes while the build is broken.
