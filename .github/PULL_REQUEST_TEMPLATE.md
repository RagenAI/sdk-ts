<!-- PRs target `main`. See CONTRIBUTING.md. -->

## What and why

What changed, and what problem it solves. If there's an issue, link it with
`Fixes #123`.

## How it was verified

What you actually ran, and what it said.

## Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Installed with **pnpm** — `pnpm-lock.yaml` is the only lockfile touched
- [ ] Tests added or updated for the changed behaviour
- [ ] **If this changes anything exported from `src/index.ts`:** the change is
      additive, or it is flagged as breaking (`feat!:` / `BREAKING CHANGE:`)
      and was agreed in an issue first
- [ ] **If this adds code under `src/`:** no Node-only APIs — `globalThis.fetch`
      rather than `node:*`, and every `process.env` read guarded with
      `typeof process !== "undefined"`
- [ ] **If this touches the wire format:** it matches OpenAI's shape
      (snake_case on the wire)
- [ ] **If this throws:** it throws a `RagenError` subclass, not a bare `Error`
- [ ] **If this changes an API used by `examples/`:** the example was updated
      and still runs
- [ ] No API key, token or real endpoint appears in a test, fixture or example
- [ ] README updated where the change makes it wrong
