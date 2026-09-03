# @ragenai/sdk

[![npm version](https://img.shields.io/npm/v/@ragenai/sdk.svg)](https://www.npmjs.com/package/@ragenai/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

Official TypeScript / JavaScript SDK for **[Ragen.ai](https://ragen.ai)** — the EU-native, GDPR-compliant Retrieval-Augmented Generation platform with an OpenAI-compatible wire format. Use the same shape you already know from `openai`, but with Ragen-specific ergonomics like `assistant_id`, file-processing status, and `waitUntilProcessed()`.

## Installation

```bash
npm install @ragenai/sdk
# or
pnpm add @ragenai/sdk
# or
yarn add @ragenai/sdk
```

Requires Node.js 18+ (for built-in `fetch`, `FormData`, and `ReadableStream`).

## Quick start

```ts
import { Ragen } from "@ragenai/sdk";

const ragen = new Ragen({ apiKey: process.env.RAGEN_API_KEY });

const completion = await ragen.chat.completions.create({
  assistantId: "11111111-1111-4111-8111-111111111111",
  messages: [{ role: "user", content: "What is our refund policy?" }],
});

console.log(completion.choices[0].message.content);
```

## Usage

### Chat — non-streaming

```ts
const completion = await ragen.chat.completions.create({
  assistantId: "11111111-1111-4111-8111-111111111111",
  messages: [
    { role: "system", content: "Answer briefly." },
    { role: "user", content: "What is our refund policy?" },
  ],
  temperature: 0.7,
  max_tokens: 500,
});
```

### Chat — streaming

```ts
const stream = ragen.chat.completions.stream({
  assistantId: "11111111-1111-4111-8111-111111111111",
  messages: [{ role: "user", content: "Explain our onboarding process" }],
  stream_options: { include_usage: true },
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
  if (chunk.usage) console.log("\nUsage:", chunk.usage);
}

// Or, the convenience helper:
const text = await ragen.chat.completions.streamToString({
  assistantId: "11111111-1111-4111-8111-111111111111",
  messages: [{ role: "user", content: "Summarize the handbook" }],
});
```

If you set `assistantId` on the client, you can omit it per call:

```ts
const ragen = new Ragen({
  apiKey: process.env.RAGEN_API_KEY,
  assistantId: "11111111-1111-4111-8111-111111111111",
});

await ragen.chat.completions.create({
  messages: [{ role: "user", content: "Hi" }],
});
```

### Chat — Ragen's native endpoint

`chat.completions.*` above is OpenAI-compatible, and it's what you want
for most integrations. `chat.send*` targets Ragen's own `POST /v1/chat`
instead, which takes two things the OpenAI wire format has no room for:

- **`context`** — up to 20,000 characters of extra page or document
  text, appended to the question server-side. Built for embedded
  chatbots that pass along whatever page the visitor is reading.
- **separated reasoning** — on a stream, the model's intermediate
  thinking arrives as its own event type instead of being mixed into
  the answer.

```ts
const { text } = await ragen.chat.send({
  content: "What is our refund policy?",
  context: document.body.innerText,
});
```

Streaming yields tagged events, so switch on `type` rather than
concatenating everything — otherwise the reasoning ends up inside your
answer:

```ts
for await (const event of ragen.chat.sendStream({
  content: "Why was my order delayed?",
  reasoning_effort: "medium",
})) {
  if (event.type === "text") process.stdout.write(event.text);
  else console.debug("[thinking]", event.reasoning);
}

// Convenience: answer text only, reasoning dropped.
const answer = await ragen.chat.sendToString({ content: "Summarize this" });
```

`reasoning_effort` (`"low" | "medium" | "high"`) works on
`chat.completions.*` too. Only reasoning-capable models act on it;
those default to `"medium"` server-side.

### Files

```ts
// Node — pass a path
const file = await ragen.files.upload("./handbook.pdf");

// Browser / edge — pass a Blob or Uint8Array
const file2 = await ragen.files.upload(blob, { filename: "handbook.pdf" });

// Wait for embeddings to finish
await ragen.files.waitUntilProcessed(file.id);

// Or do both in one call
const ready = await ragen.files.uploadAndWait("./handbook.pdf");

// List, retrieve, delete
const list = await ragen.files.list({ limit: 50 });
const f = await ragen.files.retrieve(file.id);
await ragen.files.delete(file.id);
```

### Assistants

```ts
const assistant = await ragen.assistants.create({
  name: "Support Bot",
  instructions: "Be concise.",
});

// The API pages at 20 by default — pass limit/after to see the rest.
const all = await ragen.assistants.list({ limit: 100 });
const a = await ragen.assistants.retrieve(assistant.id);
const updated = await ragen.assistants.update(assistant.id, {
  name: "Support Bot v2",
});
await ragen.assistants.delete(assistant.id);
```

### Threads

Thread and message CRUD on `/v1/threads` follows the OpenAI Assistants
API, so the official OpenAI SDK already handles it against a Ragen base
URL — this SDK doesn't duplicate it. The one exception is **listing**
threads, which isn't in the OpenAI spec at all:

```ts
const { data } = await ragen.threads.list({ limit: 50, order: "desc" });

// Or page through every thread in the org:
for await (const thread of ragen.threads.iterate()) {
  console.log(thread.id, thread.title, thread.assistant_id);
}
```

`title` and `assistant_id` are Ragen extensions on the thread object.

## Error handling

All errors thrown by the SDK extend `RagenError`. Pattern-match on the subclass to handle specific HTTP statuses:

```ts
import {
  RagenAuthError,
  RagenNotFoundError,
  RagenRateLimitError,
  RagenAPIError,
  RagenError,
} from "@ragenai/sdk";

try {
  await ragen.chat.completions.create({
    assistantId: "11111111-1111-4111-8111-111111111111",
    messages: [{ role: "user", content: "Hi" }],
  });
} catch (err) {
  if (err instanceof RagenRateLimitError) {
    // 429 — already auto-retried, surface to caller
  } else if (err instanceof RagenAuthError) {
    // 401 — bad API key
  } else if (err instanceof RagenNotFoundError) {
    // 404
  } else if (err instanceof RagenAPIError) {
    // 5xx — already auto-retried
  } else if (err instanceof RagenError) {
    console.error(err.status, err.code, err.message);
  } else {
    throw err;
  }
}
```

The SDK automatically retries on **429** and **5xx** responses with exponential backoff and jitter, up to `maxRetries` times (default 2).

## Configuration

| Option        | Type           | Default                     | Description                                                    |
| ------------- | -------------- | --------------------------- | -------------------------------------------------------------- |
| `apiKey`      | `string`       | `process.env.RAGEN_API_KEY` | API key. Required.                                             |
| `assistantId` | `string`       | —                           | Default `assistant_id` to use when one is not passed per-call. |
| `baseURL`     | `string`       | `https://api.ragen.ai/v1`   | API base URL. Override for self-hosted deployments.            |
| `maxRetries`  | `number`       | `2`                         | Retry attempts on 429/5xx and transient errors.                |
| `timeout`     | `number` (ms)  | `30000`                     | Per-request timeout.                                           |
| `fetch`       | `typeof fetch` | `globalThis.fetch`          | Custom `fetch` implementation (e.g. for testing or polyfills). |

## Examples

The [`examples/`](./examples) directory has runnable scripts:

- [`basic-chat.ts`](./examples/basic-chat.ts) — non-streaming completion
- [`streaming-chat.ts`](./examples/streaming-chat.ts) — token streaming + usage
- [`upload-and-query.ts`](./examples/upload-and-query.ts) — upload, wait, query
- [`nextjs-route-handler.ts`](./examples/nextjs-route-handler.ts) — Next.js App Router edge streaming

## Documentation

Full API reference and platform docs at **<https://docs.ragen.ai>**.

## License

MIT
