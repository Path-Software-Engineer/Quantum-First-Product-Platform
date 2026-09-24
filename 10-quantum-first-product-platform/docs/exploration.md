# Sprint 1 / Day 1548 — product exploration

Status: exploration, not a completed sprint or a claim of elapsed course days.

## Decision

Build a contract-first product platform for a bounded post-quantum-readiness
offer. The software owns workspaces, product versions, evidence review and a
generated one-pager. It does not own the research thesis, certify security or
execute quantum workloads. The first vertical slice is an authorized editor
creating a versioned product, attaching reviewable claims and publishing an
accessible one-pager after explicit approval.

The current project map supplied by the user supersedes the older planning
README: Sprint 1 is a Docusaurus + React, NestJS and PostgreSQL application,
not a static one-pager. Sprint 2 adds PQC assessments and reports; Sprint 3
adds the developer platform, worker and outbox.

## Entry evidence and boundary

- Software Project 09 and AI Project 54 have published, versioned releases.
- This checkout began from a clean `main` at `a6edd3e`; no Sprint 1 code was
  present before this exploration branch.
- AI Project 55's venture handoff says `pending_human_review`. Its candidate
  wedge, customer archetypes, pricing and promise must not be imported as
  approved product content. Synthetic fixtures may exercise the software but
  must be labelled synthetic and never used as market validation.
- There are no customer interviews, pilot results, revenue, compliance
  certification or production OIDC credentials in scope.

## Sprint 1 outcome and acceptance

An authenticated workspace member with an appropriate role can create a
product version, connect capabilities and use cases, submit evidence-backed
claims, obtain a distinct reviewer approval and publish an immutable
one-pager build. Another workspace cannot read or mutate its private data.
Public visitors see only explicitly published versions, evidence limitations
and provenance. The implementation must prove these paths with positive and
negative API, database and browser tests before `v0.1.0` is tagged.

## Non-goals now

No real billing, quantum execution, security certification, public customer
testimonials, remote contract ingestion, API keys, webhooks or cloud deployment.
Do not borrow code, database, credentials or runtime state from AI Engineer.
