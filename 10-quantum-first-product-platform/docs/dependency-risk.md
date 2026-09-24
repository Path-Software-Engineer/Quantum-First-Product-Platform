# Dependency security decision — Sprint 1

Checked on 2026-09-24 from the committed npm lockfile.

## Outcome

`npm audit --audit-level=high` reports **0 vulnerabilities**. The production
portal, strict TypeScript build and six Playwright acceptance flows also pass.

## Decision

The portal pins the official `4.0.0-canary-6808` Docusaurus packages. This is
a deliberate, narrow pre-release exception:

- the stable `3.10.2` toolchain resolved `serialize-javascript@6.0.2`, affected
  by a high-severity advisory;
- attempted npm overrides did not change the stable dependency graph;
- canary `6808` requires Node `>=24.14`, compatible with the repository's
  pinned Node 24 boundary;
- later canaries were rejected because they require Node 26;
- all Docusaurus packages use the same exact canary build, with no ranges.

The next stable Docusaurus release should replace this pin after it passes the
same clean install, production build, accessibility and responsive tests.
