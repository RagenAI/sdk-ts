# Contributing to the Ragen TypeScript SDK

Thanks for wanting to help. This is `@webamigos/ragen-sdk-ts`, the official TypeScript
client for [Ragen.ai](https://ragen.ai). It's a published package other people
depend on, so the bar for changing the public surface is higher than for an
application — that's most of what this guide is about.

[AGENTS.md](AGENTS.md) covers the technical detail: layout, conventions,
commands. This file covers the process.

## Before you start

- **Bugs and small fixes** — open a PR directly. No need to ask first.
- **Anything that changes the public API** — open an issue first. See
  "The public surface is a contract" below.
- **Security vulnerabilities** — do **not** open an issue. See
  [SECURITY.md](SECURITY.md).

## Branch model

- `main` — the released branch. Base your work here and target it in PRs.
- Topic branches — one per change, named `feat/…`, `fix/…`, `chore/…`,
  `refactor/…` or `docs/…`.

## Getting set up

Node.js 18 or newer, and **pnpm** — not npm. The lockfile is `pnpm-lock.yaml`
and CI installs with `--frozen-lockfile`, so an npm-generated lockfile will fail
the build.

```bash
pnpm install       # also sets up the husky hooks
pnpm build         # tsup → dual ESM + CJS + .d.ts
pnpm test
```

## Before you open a PR

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

## Three things that catch everyone

**1. The public surface is a contract.** Anything exported from `src/index.ts`
is depended on by real installs. Adding an export or an optional field is fine.
Renaming, removing, or narrowing a type is a breaking change and needs a major
version bump — which means it needs a conversation before you write it, not
after.

**2. No Node-only APIs in `src/`.** The SDK runs in browsers and edge runtimes
as well as Node. Use `globalThis.fetch`, never `node:fetch` or `node:http`.
Guard every `process.env` read with `typeof process !== "undefined"` — see
`client.ts` for the pattern. A bare `process.env` reference throws in a browser
bundle, and nothing in the Node test suite will catch it.

**3. The wire format is OpenAI's, not ours.** Requests and responses are
snake_case on the wire so users can migrate by swapping an import. camelCase is
only for SDK-specific options like `assistantId`. When adding a feature to
chat/files/assistants, match the OpenAI shape exactly rather than inventing a
nicer one — check the OpenAI Node SDK for the reference shape.

## Errors

Throw `RagenError` subclasses (`RagenAuthError`, `RagenRateLimitError`, …) —
never a bare `Error`. Status code, error type and `param` belong on the error
object, where callers can branch on them.

## Where code goes

Resources (`src/resources/`) are thin HTTP wrappers. Retries, timeouts and auth
live in `src/utils.ts`; the SSE parser lives in `src/streaming.ts`. If you find
yourself adding retry logic or a second SSE parser inside a resource, it belongs
in the shared module instead.

## Tests and examples

Tests live in `tests/`, mirroring `src/`, and run under Vitest. New behaviour
needs a test. Mock the network — never hit a real Ragen API from the suite.

Anything in `examples/` must run as-is:

```bash
RAGEN_API_KEY=... npx tsx examples/<name>.ts
```

If you change an API that an example uses, update the example in the same PR.

## Comments

Default to none. Write one only when the _why_ is non-obvious — a workaround, an
invariant, a constraint. Don't restate what the code does, and don't add
file-header banners.

## Commits and PRs

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on the `commit-msg` hook — a malformed message is rejected locally.
`pnpm commit` gives you a guided prompt if you'd rather not write it by hand.

The commit type drives the released version, so it matters:

```
fix(chat): stop the SSE parser dropping the final chunk
feat(files): add list() with pagination
feat(client)!: rename baseUrl to baseURL     # ! = breaking = major
```

In the PR description, say what changed and why, and what you ran to convince
yourself it works. Link the issue with `Fixes #123`. If it touches the public
surface, say so explicitly.

## Licensing

Contributions are accepted under the [Apache License 2.0](LICENSE), the same
license that covers the project. By opening a pull request you confirm you have
the right to contribute the code and agree to license it under those terms.
