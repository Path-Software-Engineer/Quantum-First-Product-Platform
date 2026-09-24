# ADR-001 — contract-first stack

Status: accepted for Sprint 1 exploration, 2026-09-14.

Use one npm workspaces lockfile; Docusaurus 3.10.2 with React/TypeScript for
public/developer content and controlled interactive pages; NestJS 12.0.1 for
the API; PostgreSQL for source data and tenancy. The observed local Node.js is
24.15.0. Exact dependency versions and container digests must be recorded by
the bootstrap commit and checked by the gate, not left as `latest`.

Reason: the current map explicitly names this stack, while the legacy README
does not describe the required platform. Docusaurus publishes narrative but
never becomes the authority for review state. NestJS owns commands and
contracts; PostgreSQL owns durable state. No worker or broker is introduced in
Sprint 1 merely to imitate the final architecture.

Compatibility checked against official installation requirements:
[Docusaurus](https://docusaurus.io/docs/installation) and
[NestJS](https://docs.nestjs.com/first-steps). Versions are current as
queried on 2026-09-14 and may need a fresh audit at installation time.
