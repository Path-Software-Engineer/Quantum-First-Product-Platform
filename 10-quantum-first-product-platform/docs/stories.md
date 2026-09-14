# Sprint 1 stories and acceptance criteria

## User stories

- As a workspace owner, I create a product version so revisions remain
  inspectable; a published version cannot be edited in place.
- As an editor, I attach a capability, use case and bounded claim with a source
  reference and limitations; missing provenance prevents review submission.
- As a reviewer distinct from the claim owner, I approve or reject a version;
  self-approval and wrong-role approval are denied and audited.
- As a visitor, I see only published one-pagers with explicit evidence status,
  not drafts or private workspace members.
- As an operator, I can see health and correlation identifiers without
  credentials or private claim text in logs.

## Technical stories

- Auth middleware verifies issuer, audience, signature and expiry before a
  workspace context is resolved; body fields never authorize tenancy.
- Every tenant-owned query is constrained by workspace in the repository and
  RLS. Negative integration tests use a runtime role without BYPASSRLS.
- A publication transaction stores decision, audit event and immutable build
  identity; repeated requests with the same idempotency key return the same
  result or a conflict, not a duplicate publication.
- Contract examples and browser tests exercise the real API. No UI component
  computes an official claim, approval or artifact hash by itself.
