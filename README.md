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

const all = await ragen.assistants.list();
const a = await ragen.assistants.retrieve(assistant.id);
const updated = await ragen.assistants.update(assistant.id, {
  name: "Support Bot v2",
});
await ragen.assistants.delete(assistant.id);
```

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

| Option        | Type           | Default                       | Description                                                                |
| ------------- | -------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `apiKey`      | `string`       | `process.env.RAGEN_API_KEY`   | API key. Required.                                                         |
| `assistantId` | `string`       | —                             | Default `assistant_id` to use when one is not passed per-call.             |
| `baseURL`     | `string`       | `https://api.ragen.ai/v1`     | API base URL. Override for self-hosted deployments.                        |
| `maxRetries`  | `number`       | `2`                           | Retry attempts on 429/5xx and transient errors.                            |
| `timeout`     | `number` (ms)  | `30000`                       | Per-request timeout.                                                       |
| `fetch`       | `typeof fetch` | `globalThis.fetch`            | Custom `fetch` implementation (e.g. for testing or polyfills).             |

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
