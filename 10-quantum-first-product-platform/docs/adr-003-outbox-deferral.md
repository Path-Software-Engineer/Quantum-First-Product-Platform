# ADR-003 — defer delivery worker and outbox

Status: superseded by the Sprint 3 implementation.

Sprint 1 needs durable audit and publication, not external event delivery.
Keep an in-process API plus PostgreSQL transaction boundary for these
commands. The map reserves a separate NestJS delivery worker, transactional
outbox, leases, webhooks and replay for Sprint 3. Do not create a fake worker
or Redis broker now. Schema additions later require migration and tests that
prove business state and outbox event commit atomically.

Sprint 3 resolves this deferral in migration `0005_developer_docs_outbox.sql`.
Developer-document lifecycle commands now append tenant-scoped outbox events
inside the same transaction as their business state. A separate `worker:once`
entry point claims work with leases and `SKIP LOCKED`, retries failed delivery,
and operates only on explicitly assigned tenant IDs so PostgreSQL RLS remains
active. The console publisher is a development adapter, not evidence of remote
broker delivery.
