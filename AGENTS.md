# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo.

## What this is

`@ragenai/sdk` — official TypeScript SDK for [Ragen.ai](https://ragen.ai), an EU-native, GDPR-compliant RAG platform with an OpenAI-compatible wire format.

The SDK exposes four resources: `chat.completions` (streaming + non-streaming), `files`, and `assistants`. Public API is OpenAI-shaped where possible so users can migrate by swapping the import.

## Stack

- **Language**: TypeScript (strict, ES2022, `moduleResolution: bundler`)
- **Runtime targets**: Node ≥18, browsers, edge runtimes (uses global `fetch`)
- **Build**: `tsup` → dual ESM + CJS + `.d.ts` in `dist/`
- **Tests**: `vitest`
- **Lint/format**: `eslint` + `prettier`
- **Package manager**: `pnpm` (lockfile committed; CI uses `--frozen-lockfile`)

## Layout

```
src/
  client.ts          # Ragen class — entry point
  resources/         # one file per API resource
    chat.ts
    files.ts
    assistants.ts
  streaming.ts       # SSE parser for chat completions
  types.ts           # shared wire types
  errors.ts          # RagenError + subclasses
  utils.ts           # fetch wrapper, retries, timeouts
  index.ts           # public exports — keep curated
tests/               # vitest, mirrors src/
examples/            # runnable scripts (npx tsx examples/<name>.ts)
```

## Commands

```bash
pnpm install              # install (runs husky prepare automatically)
pnpm test                 # vitest run
pnpm test:watch           # vitest watch
pnpm type-check           # tsc --noEmit
pnpm lint                 # eslint src
pnpm format               # prettier --write
pnpm build                # tsup → dist/
pnpm commit               # commitizen prompt (or use raw `git commit -m` with conventional format)
```

Run `pnpm type-check && pnpm test` before declaring work done.

## Conventions

- **Public API stability**: anything exported from `src/index.ts` is part of the public surface. Don't rename or remove without a major version bump. Adding fields/methods is fine.
- **OpenAI parity**: when adding chat/files/assistants features, match OpenAI's request/response shape exactly (snake_case on the wire, camelCase only for SDK-specific options like `assistantId`). Look at the OpenAI Node SDK for reference shapes.
- **Errors**: throw `RagenError` subclasses (`RagenAuthError`, `RagenRateLimitError`, etc.) — never bare `Error`. Status code, type, and `param` belong on the error.
- **Streaming**: chat streaming uses SSE. The parser lives in `src/streaming.ts` — extend it rather than re-implementing per resource.
- **No Node-only APIs in `src/`**: the SDK runs in browsers and edge runtimes too. `process.env` reads must be guarded with `typeof process !== "undefined"` (see `client.ts`). Use `globalThis.fetch`, not `node:fetch`.
- **No business logic in resources**: resources are thin HTTP wrappers. Keep retries/timeouts/auth in `utils.ts`.
- **Examples must run as-is**: anything in `examples/` should work with `RAGEN_API_KEY=... npx tsx examples/<name>.ts`. They have their own `tsconfig.json` that adds `@types/node`.

## Comments

Default to no comments. Only write a comment when the _why_ is non-obvious — a workaround, an invariant, a constraint. Don't restate what the code does. Don't add file-header banners.

## Commits

Conventional Commits enforced via commitlint on `commit-msg`. Format:

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`, `perf`, `style`, `revert`.

`pnpm commit` opens the commitizen prompt if you'd rather not write the line by hand. `lint-staged` runs eslint + prettier on staged files via the `pre-commit` hook.

## Versioning & releases

- SemVer. Bump `package.json` version, then `git tag vX.Y.Z && git push --tags`.
- The `Release` GitHub Action publishes to npm on tag push (verifies tag matches `package.json` version, runs tests, publishes with `--provenance`).
- `NPM_TOKEN` repo secret must be set.
- Changelog lives in `CHANGELOG.md` (manual for now).

## Things to NOT do

- Don't add a default `model` to chat requests — the server owns model selection per assistant. The SDK passes through whatever the user sets, or omits the field.
- Don't add a `Models` resource. The Ragen API has no `/models` endpoint.
- Don't switch to `axios` or another HTTP client. We rely on the platform `fetch` so the SDK stays runtime-agnostic and zero-deps at runtime.
- Don't add `dependencies` casually — the SDK has zero runtime deps and we want to keep it that way. New deps need a clear justification.
- Don't commit anything to `dist/` — it's built in CI for releases and gitignored locally.
- Don't write multi-paragraph JSDoc on internal helpers. Reserve docstrings for `src/index.ts` exports.
- Don't introduce `asst_`-prefixed assistant ID samples — Ragen assistants use UUIDs. Use `11111111-1111-4111-8111-111111111111` style placeholders in docs and examples.

## When stuck

- The Ragen API source of truth lives in a separate `ragen-api` repo. If a wire format question can't be answered from existing code, ask the user — don't guess.
- For OpenAI compatibility questions, check the OpenAI Node SDK's published types as reference.
