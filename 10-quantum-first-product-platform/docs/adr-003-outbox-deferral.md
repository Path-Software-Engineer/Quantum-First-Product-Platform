# ADR-003 — defer delivery worker and outbox

Status: accepted for Sprint 1 scope.

Sprint 1 needs durable audit and publication, not external event delivery.
Keep an in-process API plus PostgreSQL transaction boundary for these
commands. The map reserves a separate NestJS delivery worker, transactional
outbox, leases, webhooks and replay for Sprint 3. Do not create a fake worker
or Redis broker now. Schema additions later require migration and tests that
prove business state and outbox event commit atomically.
