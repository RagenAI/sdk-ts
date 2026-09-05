# API surface — what this SDK covers, and what it doesn't

Ragen's API is OpenAI-compatible. The official OpenAI SDK works against it today:

```ts
const client = new OpenAI({
  baseURL: process.env.RAGEN_BASE_URL, // https://api.ragen.ai/v1
  apiKey: process.env.RAGEN_API_KEY,
});
```

That fact decides what belongs in this package.

## The rule

> Wrap what the OpenAI SDK cannot reach. Leave the rest to it.

An endpoint that follows the OpenAI spec is already served by a mature, widely-used client with its own types, retries, and streaming. Re-implementing it here buys nothing and creates a second surface to keep in sync with `apps/api` — one that will drift, because nobody re-checks a wrapper that appears to work.

Ragen-specific behaviour is the opposite case: it is reachable from the OpenAI SDK only through `extra_body` and `@ts-expect-error`, or not at all.

## Public API surface

`apps/api` exposes five controllers behind `ApiKeyGuard`, all under the `/v1` prefix. Everything under `internal/*` serves the dashboard and is **not** public — never wrap it.

| Endpoint                                 | In the OpenAI spec?                 | Here?                               |
| ---------------------------------------- | ----------------------------------- | ----------------------------------- |
| `POST /v1/chat/completions`              | Yes, plus a required `assistant_id` | ✅ `chat.completions.*`             |
| `POST /v1/chat`                          | No — Ragen's own                    | ✅ `chat.send*`                     |
| `/v1/files` (4 routes)                   | Yes                                 | ✅ `files.*`                        |
| `/v1/assistants` (5 routes)              | Yes                                 | ✅ `assistants.*`                   |
| `GET /v1/threads`                        | **No** — OpenAI has no thread list  | ✅ `threads.list()`                 |
| `/v1/threads` CRUD + messages (9 routes) | Yes                                 | ❌ deliberate — use the OpenAI SDK  |
| `GET /v1/healthcheck`                    | No                                  | ❌ unauthenticated, nothing to wrap |

### Why some OpenAI-shaped resources _are_ here

`chat.completions`, `files` and `assistants` predate this rule and stay for a reason: `chat.completions` requires Ragen's `assistant_id`, which costs OpenAI-SDK users an `extra_body` and a suppressed type error on every call. Once that resource exists, a package that covers chat but not the files feeding it is a worse experience than one that covers both.

That reasoning does not extend to _new_ resources. Threads showed where the line is: nine of its ten routes are plain OpenAI Assistants API, so they stayed out.

## What is genuinely Ragen-only

These are the things that justify the package. Each is unreachable, or awkward, from the OpenAI SDK.

### `assistant_id` on chat completions

Required by `CreateChatCompletionDto`, absent from the OpenAI spec. From the OpenAI SDK it needs `extra_body` (Python) or a `@ts-expect-error` (TypeScript). Here it's a first-class `assistantId`, settable per call or once on the client.

### `POST /v1/chat` — the native endpoint

Predates the OpenAI-compatible surface. Two of its inputs have no OpenAI equivalent at all:

- **`context`** — up to 20,000 characters of page or document text, appended to the question server-side. Built for embedded chatbots that pass along whatever page a visitor is reading.
- **separated reasoning** — its stream interleaves `{"reasoning": "..."}` events with `{"text": "..."}` ones. `sendStream()` tags them so callers can tell the model's thinking from the answer; concatenating everything would splice reasoning into the response.

For new integrations prefer `chat.completions`. `chat.send*` exists for the two features above and for callers already on it.

### `GET /v1/threads`

The OpenAI Assistants API has no thread-list endpoint, so no OpenAI SDK exposes one. Everything else about threads — create, retrieve, modify, delete, and the whole messages sub-resource — is OpenAI-shaped and intentionally not duplicated here.

The thread object carries two Ragen extensions worth typing: `title` and `assistant_id`.

### `purpose: "knowledge_base"`

A file purpose outside OpenAI's enum. `"assistants"` is accepted as an alias.

## What this SDK deliberately does not cover

Adding any of these needs a reason that outweighs the duplication:

- **Thread and message CRUD** beyond `list` — nine OpenAI-compatible routes.
- **A `models` resource** — there is no `/v1/models` endpoint. The changelog once claimed `models.list()` and `models.retrieve()` shipped; neither ever existed.
- **The Runs API** (`POST /v1/threads/{id}/runs`) — not implemented server-side.
- **Anything under `internal/*`** — projects, folders, documents, notifications, connectors, knowledge analytics, `internal/threads`. These serve the dashboard, are not covered by the public API contract, and can change without notice.
- **`GET /v1/healthcheck`** — unauthenticated liveness probe.

## Server constraints that shape this package

Two properties of `apps/api` affect nearly every change here.

### Undeclared params are fatal, not ignored

The global `ValidationPipe` runs with `forbidNonWhitelisted: true`. A field the SDK sends that the DTO doesn't declare rejects the **whole request** with a 400.

So the SDK cannot be permissive about what it forwards. Optional params must be omitted from the body, not sent as `undefined`, and every field a type advertises must exist in the DTO.

### Not every endpoint returns the OpenAI error envelope

The OpenAI-compatible controllers run `@UseFilters(OpenAiExceptionFilter)` and answer with `{ error: { message, type, code, param } }`.

`POST /v1/chat` does not. It answers three other ways: `{ error: "<string>", code }` from the service, `{ message }` — an array when the validation pipe rejects a body — from Nest's global filter, and plain text from its 500 catch-all. `src/errors.ts` normalizes all four.

When adding a resource, check its controller's decorators before assuming an error shape.

## Keeping this current

`apps/api` moves. Re-run the drift audit in [`.claude/skills/ragen-sdk-api-drift/SKILL.md`](../.claude/skills/ragen-sdk-api-drift/SKILL.md) when the API has had a busy stretch, before a release, or whenever a user reports a 400 the types said was impossible. Update the table above when coverage changes.
