---
name: ragen-sdk-api-drift
description: Audit this SDK against the live Ragen API surface — find endpoints that appeared or vanished, params the server accepts that the SDK cannot send, and response fields the types don't declare. Use before a release, after a busy stretch in apps/api, or when a user reports a 400 the types said was impossible. Triggers on "does the SDK cover everything", "API drift", "new endpoint", "sprawdź czy SDK ma wszystkie endpointy".
---

# Auditing the SDK against the API

This package and the server it talks to live in different repositories, so nothing fails when they diverge. No type checks the seam. The API grows a param, the SDK keeps sending the old body, and everything stays green until a user hits it.

The server is the `apps/api` workspace of [`WebAmigos/ragen`](https://github.com/WebAmigos/ragen), usually checked out beside this repo. Docs are in `apps/docs/docs/api-reference/`.

## Before you start: the rule that decides what counts as a gap

Read [`docs/api-surface.md`](../../../docs/api-surface.md) first. Ragen's API is OpenAI-compatible, so the official OpenAI SDK already covers most of it. **A missing OpenAI-spec endpoint is usually not a gap** — it's a deliberate non-goal.

What counts as a real gap:

- an endpoint or param outside the OpenAI spec that no OpenAI SDK can reach;
- a param the SDK sends that the server no longer accepts (that one is a live 400);
- a response field the server returns that the SDK doesn't type.

Report OpenAI-spec omissions separately, as a decision to confirm, not as a defect.

## 1. Enumerate the public surface

Public endpoints are the controllers behind `ApiKeyGuard`. Everything under `internal/*` serves the dashboard — never wrap it.

```bash
cd <ragen-app>
git grep -ln "ApiKeyGuard" -- 'apps/api/src/**/*.controller.ts'
git grep -n "@Controller(" -- 'apps/api/src/**/*.controller.ts' | grep -v internal
```

Then list the routes on each:

```bash
grep -nE "@(Controller|Get|Post|Put|Patch|Delete)\(" apps/api/src/<resource>/<resource>.controller.ts
```

Remember the global prefix is `/v1` (set in `apps/api/src/main.ts`), and that `POST /:id` alongside `PATCH /:id` is usually one operation with an OpenAI-convention alias, not two.

## 2. Diff the request contracts

For each endpoint the SDK covers, read the DTO — **not** the docs page, which has drifted before:

```bash
cat apps/api/src/<resource>/dto/*.dto.ts
```

Compare field by field against `src/types.ts` and the body builder in `src/resources/`. Three failure modes, in order of severity:

1. **The SDK can send something the DTO doesn't declare.** A live 400 on every such call, because `forbidNonWhitelisted` rejects the whole request. Highest priority.
2. **The DTO accepts something the SDK can't send.** A capability users cannot reach.
3. **A validator narrows a type the SDK leaves wide.** `@IsIn([...])` against a `string` field is a runtime 400 where a union type would have been a compile error.

## 3. Diff the response contracts

The mapper is the truth, not the docs:

```bash
cat apps/api/src/<resource>/*.mapper.ts
```

Count the fields it returns against the interface in `src/types.ts`. Under-typing is invisible — the data arrives, TypeScript just won't admit it exists.

## 4. Check the error contract

Per controller, because it varies:

```bash
grep -n "UseFilters" apps/api/src/<resource>/*.controller.ts
```

`@UseFilters(OpenAiExceptionFilter)` means `{ error: { message, type, code, param } }`. Its absence means Nest's global filter plus whatever the service writes by hand, and `src/errors.ts` has to normalize it. See `docs/lessons/an-endpoint-without-the-openai-filter-answers-in-four-shapes.md`.

## 5. Check the docs against both

Read `CHANGELOG.md`, `README.md` and `docs/api-surface.md` as a set. A contradiction between them is itself a finding, and the file agreeing with the code wins — the changelog has claimed a resource that never existed.

## Reporting

Group findings by resource, and for each say which of the three gap types it is and whether it is reachable another way. Separate:

- **live defects** — a 400 users hit today;
- **unreachable capability** — the server supports it, nobody can call it;
- **deliberate non-coverage** — OpenAI-spec surface left to the OpenAI SDK, listed so the decision is re-confirmed rather than silently inherited.

Anything that changes coverage updates the table in `docs/api-surface.md` in the same change.

## Do not

- Wrap an endpoint just because the audit found it. Check `docs/api-surface.md` first; adding OpenAI-spec surface needs a reason that outweighs keeping it in sync forever.
- Trust the docs page for a param list. It described `model` as ignored for months while the service was applying it.
- Treat `internal/*` as public. It has no compatibility guarantee.
