---
name: ragen-sdk-release
description: Cut a release of @ragenai/sdk — decide the version bump from what actually changed for consumers, then tag so the publish workflow runs. Use when publishing to npm, bumping the version, or judging whether a change is breaking. Triggers on "release", "publish", "version bump", "wydaj nową wersję".
---

# Releasing `@ragenai/sdk`

Publishing is tag-driven. Pushing a `v*` tag runs `.github/workflows/release.yml`, which installs with a frozen lockfile, runs type-check + test + build, **verifies the tag matches `package.json` version**, publishes with npm provenance, and creates a GitHub release.

There is no manual `pnpm publish` step. Getting the version right before tagging is the whole job.

## 1. Decide the bump from the consumer's view

The package is pre-1.0, so a breaking change goes in the minor. That is not permission to skip the analysis — say plainly in the changelog what breaks.

Read the diff since the last tag and sort it:

```bash
git log --oneline "$(git describe --tags --abbrev=0)"..HEAD
git diff "$(git describe --tags --abbrev=0)"..HEAD -- src/index.ts
```

`src/index.ts` is the public contract. A change there is a release-note item by definition.

**The dangerous class is a break that still compiles.** A removed export fails the consumer's build immediately, which is the safe kind. These do not:

- **A reordered or inserted parameter.** `list(options)` → `list(params, options)` keeps compiling and silently reinterprets the caller's argument — `list({ signal })` stops aborting.
- **A widened optional turning required**, or a narrowed union — compiles at the call site that happens to pass the surviving member.
- **A changed default** — same code, different behaviour.

Anything in that class is **Breaking** in the changelog with the migration written out, however small the diff.

## 2. Check the server dependency

The SDK can only send what `apps/api` accepts. If this release adds a param or an endpoint, the matching server change has to be **deployed first**, or every call using it is a 400 — `forbidNonWhitelisted` rejects the whole request, not just the field.

Before tagging, confirm the server side has shipped. If it hasn't, either wait or say in the release notes which minimum API version the feature needs.

## 3. Update the changelog

`CHANGELOG.md` follows Keep a Changelog. Promote `[Unreleased]` to the new version with a date, keeping the `Added` / `Changed` / `Fixed` grouping and the **Breaking** callouts.

Entries are claims about the public surface — verify each against `src/index.ts` rather than against intent. The changelog has previously announced a resource that never existed; see `docs/lessons/the-changelog-promised-a-resource-that-never-shipped.md`.

## 4. Bump, gate, tag

```bash
pnpm verify                      # type-check + lint + test + build
```

Then set the version, commit, and tag. The tag must equal `v` + `package.json` version exactly, or the workflow fails at the verify step:

```bash
npm version <patch|minor|major> -m "%s"    # bumps package.json and commits
git push && git push --tags
```

Watch the run. A failure after the publish step means the package is on npm but the GitHub release is missing — fix forward, never republish a version.

## 5. After it lands

```bash
npm view @ragenai/sdk version
```

Confirm the version and that provenance is attached. `NPM_TOKEN` must be a valid repo secret; publishing fails at the last step if it has expired.

## Do not

- **Don't publish from a laptop.** The workflow is the only path that attaches provenance, and a local publish makes the next tagged run collide with an existing version.
- **Don't retag.** npm versions are immutable; moving a tag desynchronizes the GitHub release from what was published. Cut the next patch instead.
- **Don't tag with a dirty tree or an unmerged branch.** The workflow builds from the tag, not from your working copy.
- **Don't ship an SDK feature ahead of its server change.** It types cleanly and 400s for every user.
