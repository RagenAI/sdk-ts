# Lessons

A catalog of non-obvious corrections and gotchas, indexed so an agent (or a human) can check the relevant area before starting nontrivial work in it, instead of re-discovering the same bug. Mirrors the mechanism used in the [`WebAmigos/ragen`](https://github.com/WebAmigos/ragen) monorepo.

Most entries here are about the seam between this package and `apps/api`. That seam is where the failures live: it has no type checking across it, and the server rejects more than a typical HTTP API does.

## How to use this catalog

Before starting a nontrivial task, skim the bullets under the area(s) it touches — not the whole catalog. Each bullet links to a lesson file with four fixed sections: **Context** (what was happening), **Problem** (what went wrong, concretely), **Rule** (the durable takeaway), **Applies to** (scope).

## Adding or updating a lesson

After a nontrivial correction or a non-obvious gotcha (see `AGENTS.md`'s "Post-Task Workflow"):

1. Check whether an existing lesson already covers it — extend that file instead of creating a near-duplicate.
2. Otherwise add a new file under `docs/lessons/<kebab-case-slug>.md` with the front matter (`title`, `modules`, `areas`, `topics`) and the four-section shape shown by any existing lesson.
3. Add one bullet to the relevant `### <area>` section below (create the section if it's a new area).

Write the rule so it holds after the specific bug is forgotten. "Check the DTO, not the docs" survives; "add `top_p` to the DTO" does not.

## Catalog

### integration

- [An endpoint without `OpenAiExceptionFilter` does not return the OpenAI error envelope, and the status code hides it](lessons/an-endpoint-without-the-openai-filter-answers-in-four-shapes.md) — area:integration; module:chat,errors; topic:error-handling,api-contracts,native-chat,testing. `POST /v1/chat` answers four different ways; parsing only `error.message` turned every failure into "request failed with status 404" while the error subclass stayed correct, so class-only assertions passed.
- [A param the server DTO does not declare rejects the whole request](lessons/forbidnonwhitelisted-makes-an-undeclared-param-a-400.md) — area:integration; module:types,chat,assistants; topic:api-contracts,validation,type-safety. `forbidNonWhitelisted` means an extra field is fatal, not ignored — so an SDK type advertising a field the DTO lacks guarantees a 400.
- [A `list()` that forwards no pagination params silently returns the server default and looks complete](lessons/a-list-method-without-pagination-params-looks-complete.md) — area:integration; module:assistants,threads,files; topic:pagination,api-contracts,silent-truncation. Also the case for treating a source-compatible signature change as breaking.

### release

- [Re-running a workflow run replays its original commit — moving the tag afterwards changes nothing](lessons/re-running-a-workflow-replays-its-original-commit.md) — area:release; module:ci,release; topic:github-actions,npm,publishing,immutability,tags. Published 0.2.0 to npm declaring the wrong license, which npm's immutable version metadata made uncorrectable; the fix was a new version plus `npm deprecate`.

### documentation

- [The changelog announced a resource that exists in neither the SDK nor the API](lessons/the-changelog-promised-a-resource-that-never-shipped.md) — area:documentation; module:docs; topic:docs-drift,changelog,public-surface. `AGENTS.md` forbade the resource while `CHANGELOG.md` claimed it shipped; both were being read.
