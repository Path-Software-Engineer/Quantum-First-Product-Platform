# Sprint 3 — Developer API Docs Template Builder

## Outcome

Sprint 3 converts structured, tenant-owned API metadata into reviewed,
immutable developer documentation. It covers API metadata, endpoint contracts,
request/response schemas, error guidance, curl and Python examples, quickstart,
Markdown export, public rendering and asynchronous delivery evidence.

The builder documents a declared contract. It does not probe an API, verify
uptime, validate production credentials or prove that an implementation
matches the examples.

## Governed lifecycle

1. An editor creates an API documentation project linked to a product version.
2. The editor adds endpoint, schema, error, example and quickstart resources.
3. A distinct reviewer verifies completeness and records a review note.
4. A publisher generates deterministic Markdown plus a SHA-256 digest.
5. Publication copies only the reviewed projection to the public table.
6. The same database transaction writes an outbox event for later delivery.

Review fails closed until at least one endpoint, one error, curl and Python
examples, and one quickstart exist. The author cannot self-review.

## Transactional outbox and worker

Every lifecycle event is written beside business state in the same PostgreSQL
transaction. `worker:once` processes explicit tenant IDs from
`P10_OUTBOX_ORGANIZATION_IDS`, claims available records using `FOR UPDATE SKIP
LOCKED`, increments attempts, and marks an event published only after the
publisher succeeds. Failed delivery clears the lease and records the error for
retry. This avoids a privileged cross-tenant worker and keeps RLS active.

The included console publisher is a development adapter. A production broker
adapter remains an infrastructure choice; events are not described as remotely
delivered merely because they exist in the outbox.

```powershell
$env:P10_OUTBOX_ORGANIZATION_IDS = "11111111-1111-4111-8111-111111111111"
npm run build -w control-api
npm run worker:once -w control-api
```

## Public boundary

`GET /api/v1/public/developer-docs/{buildId}` exposes only the immutable
snapshot, Markdown, digest and publication time. Organization, workspace,
author and reviewer identifiers remain in tenant-scoped storage. The portal at
`/developer-docs?build=<uuid>` supplies an accessible reference, quickstart,
error guidance, examples and Markdown download.

## Acceptance evidence

- Strict TypeScript, Nest build and Docusaurus production build.
- Versioned and formally validated OpenAPI 3 contract with Swagger UI.
- Unit tests for input boundaries, deterministic Markdown and worker retry.
- HTTP tests for public/private behavior and interactive API documentation.
- PostgreSQL 17.10 tests for RLS, independent review, immutable build,
  publication and atomic outbox records.
- Playwright desktop/mobile coverage with axe, empty/published/error states and
  horizontal-overflow checks.
- Dependency audit and Git whitespace gate.
