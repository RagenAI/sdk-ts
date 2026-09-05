# Security Policy

`@webamigos/ragen-sdk-ts` is a client library that holds an API key and talks to the Ragen
API on a user's behalf. It runs inside other people's applications, so a flaw
here ships to everyone who upgrades. We take reports seriously and respond on a
stated schedule.

## Reporting a vulnerability

**Do not open a public issue.** Report privately through GitHub's [private
vulnerability
reporting](https://github.com/webamigos/ragen-sdk-ts/security/advisories/new), or by
email to **security@webamigos.pl**.

Include what you have — a partial report is better than none:

- what the vulnerability is, and which module or method it affects
- the SDK version, and the runtime (Node, browser, edge)
- steps to reproduce, or a proof of concept
- the impact you think it has, and who it affects
- a suggested fix, if you have one

## What to expect

| Step                                           | Timeline                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Acknowledgement that we received your report   | 48 hours                                                              |
| Initial assessment and severity classification | 7 days                                                                |
| A fix timeline communicated back to you        | 14 days                                                               |
| Patch released                                 | Critical: as fast as we can. High: 30 days. Medium/low: next release. |

We will keep you updated as it moves, and credit you in the release notes unless
you would rather stay anonymous.

## Scope

**In scope** — anything in this package that puts a user's key or data at risk:

- **leaking the API key** — into an error message, a thrown stack trace, a log
  line, a retry that re-sends it to a different host, or anywhere it can reach
  the browser in a bundled build
- sending the key or request bodies to an unintended host: unvalidated
  `baseURL`, following a redirect to another origin while keeping the
  `Authorization` header, or SSRF through a user-supplied path
- prototype pollution or unsafe deserialization when parsing API responses or
  SSE frames
- the SSE parser mis-framing a stream in a way that lets injected content be
  read as a protocol event
- disabling or weakening TLS verification
- a supply-chain problem in what we publish: a compromised dependency, or
  anything in the `dist/` tarball that isn't built from this repo

**Out of scope:**

- an application shipping its API key to the browser. The SDK is meant to be
  called from a server; a key in client-side code is exposed by that choice, not
  by this library. Tell us if something in our API or docs _encourages_ it —
  that we want to fix.
- vulnerabilities in the Ragen API itself rather than this client — report those
  through [ragen-app](https://github.com/webamigos/ragen/security/advisories/new)
- denial of service through sheer volume, and rate-limit tuning
- results from an automated scanner with no demonstrated exploit
- advisories against a transitive dependency with no path to exploitation
  through this SDK's actual usage

## Supported versions

Security fixes land on the latest minor release. If you are on an older major,
upgrade — we do not backport.

## A note on key handling

The SDK reads `RAGEN_API_KEY` from the environment only where `process` exists,
and otherwise expects the key to be passed explicitly to the client. It never
persists the key, and never sends it anywhere other than the configured
`baseURL`. If you observe it doing otherwise, that is a vulnerability and we
want to hear about it.
