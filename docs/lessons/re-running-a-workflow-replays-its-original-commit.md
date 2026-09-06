---
title: "Re-running a workflow run replays its original commit — moving the tag afterwards changes nothing"
modules: ["ci", "release"]
areas: ["release"]
topics: ["github-actions", "npm", "publishing", "immutability", "tags"]
---

# Re-running a workflow run replays its original commit — moving the tag afterwards changes nothing

**Context**: cutting 0.2.0. The tag was pushed, the Release workflow ran, and the publish step failed twice on credentials — first `E404` (the token had no write access to the `@webamigos` scope), then `EOTP` (the replacement was a classic _Publish_ token, which cannot bypass 2FA in CI). Between those attempts the release content changed: the repo was relicensed from MIT to Apache 2.0, `LICENSE` and `NOTICE` were added to `files`, and the `v0.2.0` tag was deleted and recreated on the new commit.

**Problem**: once the credentials were finally right, the fix applied was `gh run rerun <id> --failed` on the original run. **A re-run replays the exact commit that run was created for.** It does not consult the branch, and it does not care that the tag it was triggered by now points somewhere else. It published `b20b2f6` — the pre-relicensing commit — so `@webamigos/ragen-sdk-ts@0.2.0` went to npm declaring `"license": "MIT"`, with no `LICENSE` or `NOTICE` in the tarball.

The moved tag had no effect at all. The push of the corrected tag did start a second, correct run, but by then npm answered `E403 You cannot publish over the previously published versions: 0.2.0`.

**npm version metadata is immutable.** A wrong `license`, `name`, or file list cannot be edited after publish — the only remedies are a new version plus `npm deprecate` on the bad one, or `npm unpublish` inside the 72-hour window, which still does not free the number for 24 hours. The fix here was 0.2.1.

**Rule**: re-run a failed run only when the failure was purely environmental _and_ the content it would publish is still the content you want. The moment the release contents change — a new commit, an amended commit, a moved tag — the old run is stale and must not be re-run. Start a fresh run instead:

```bash
git push origin :refs/tags/vX.Y.Z   # drop the old tag
git tag -a vX.Y.Z -m "vX.Y.Z"       # recreate on the commit you actually want
git push origin vX.Y.Z              # this triggers a new run
```

Before any publish that cannot be undone, verify the artifact rather than the intention: `npm pack --dry-run --json` shows the exact file list and `package.json` shows the exact `license` that will be frozen into the registry.

**Applies to**: `.github/workflows/release.yml` and any tag-driven publish. The re-run semantics are a GitHub Actions property, not an npm one, so the same trap applies to any workflow whose output depends on the commit — deployments and container image builds included.
