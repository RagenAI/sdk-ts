---
name: Bug report
about: Something in the SDK behaves incorrectly
labels: bug
---

<!-- Security vulnerabilities do NOT belong here — see SECURITY.md. -->

## What happens

## What you expected instead

## Reproduction

A minimal snippet. **Redact your API key.**

```ts
import { Ragen } from "@webamigos/ragen-sdk-ts";

const ragen = new Ragen({ apiKey: process.env.RAGEN_API_KEY });
// ...
```

## Environment

- `@webamigos/ragen-sdk-ts` version:
- Runtime: <!-- Node 20 / Node 22 / browser / Cloudflare Workers / Vercel Edge / Deno / Bun -->
- Bundler, if any: <!-- webpack / vite / esbuild / tsup / none -->
- Module format: <!-- ESM or CJS -->
- TypeScript version, for type errors:

## Which area

- [ ] `chat.completions` — non-streaming
- [ ] `chat.completions` — streaming
- [ ] `files`
- [ ] `assistants`
- [ ] Errors / retries / timeouts
- [ ] TypeScript types
- [ ] Build output (ESM/CJS/`.d.ts` resolution)

## Error output

**Redact your API key, assistant IDs and document contents.**

<details>
<summary>Output</summary>

```

```

</details>

## If this is a streaming problem

- Does the same request work non-streaming?
- Where does it break — first chunk, mid-stream, or the final chunk?

## If this is a bundling or import problem

- Does it reproduce in plain Node without the bundler?
- Is it an ESM/CJS interop error, or a missing/incorrect type?
