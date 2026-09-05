---
title: "The changelog announced a resource that exists in neither the SDK nor the API"
modules: ["docs"]
areas: ["documentation"]
topics: ["docs-drift", "changelog", "public-surface"]
---

# The changelog announced a resource that exists in neither the SDK nor the API

**Context**: auditing the SDK's coverage against `apps/api`'s controllers. `CHANGELOG.md`'s initial-release section listed `models.list()` and `models.retrieve()` among the shipped features.

**Problem**: there is no `models` resource in `src/`, nothing named `Models` exported from `src/index.ts`, and no `/v1/models` controller in `apps/api`. The entry described a feature that never existed at any point.

Worse, the repo contradicted itself: `AGENTS.md` already carried the instruction _"Don't add a `Models` resource. The Ragen API has no `/models` endpoint."_ One file told agents the resource was forbidden while another told users it had shipped. Both were being read.

A changelog is not commentary — it is the document users check to decide whether a version does what they need, and the one an agent reads to learn what the package contains. An entry for something that never shipped sends a user looking for a method that does not exist, and invites an agent to "restore" it.

**Rule**: changelog entries are claims about the public surface, so verify them against `src/index.ts` exports, not against intent or a plan. When auditing, read `AGENTS.md`, `README.md` and `CHANGELOG.md` as a set — a contradiction between them is itself the finding, and the file that agrees with the code wins. Delete a false entry rather than leaving it as history; it was never true, so there is nothing to preserve.

**Applies to**: `CHANGELOG.md`, `README.md`, and `docs/api-surface.md` — every file that describes what the package can do. `docs/api-surface.md`'s coverage table is the one most likely to drift, because `apps/api` changes without anything here failing.
