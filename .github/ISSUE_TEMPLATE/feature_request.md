---
name: Feature request
about: Propose a change or addition to the SDK
labels: feature
---

## The problem

What can't you do today, and what does that cost you? Describe the situation
rather than the solution.

## What you have in mind

If this maps to a Ragen API endpoint, link it or paste the request/response
shape.

## What you've already tried or considered

Including workarounds, and why they aren't enough.

## Does this change the public API?

- [ ] No — internal only
- [ ] Yes, additively (a new method, or a new optional field)
- [ ] Yes, breaking (a rename, removal, or narrowed type)

## Anything else

<!--
Two constraints shape what can land here:

1. The wire format mirrors OpenAI's so people can migrate by swapping an import.
   A nicer-but-different shape for an endpoint OpenAI also has is unlikely to
   land; propose it upstream in the API instead.

2. The SDK runs in browsers and edge runtimes, not just Node. Anything needing
   a Node-only API (fs, crypto, http) can't go in `src/`.
-->
