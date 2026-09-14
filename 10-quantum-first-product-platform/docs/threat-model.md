# Initial Sprint 1 threat model

| Threat | Boundary | Planned control | Required negative test |
| --- | --- | --- | --- |
| Cross-workspace IDOR | API → PostgreSQL | Membership guard, workspace-scoped repository and FORCE RLS | Actor B cannot GET/PATCH A's product by guessed ID |
| Forged or stale identity | Browser → API | JWT issuer/audience/signature/expiry validation; local issuer only in development | Expired, wrong audience and unsigned tokens denied |
| Self-approval or evidence laundering | Review workflow | Distinct reviewer, source completeness and audit decision | Owner cannot approve own claim; pending AI bundle rejected |
| Stored XSS in one-pager | Structured content → public page | Escaped React rendering and allowlisted template fields | HTML/script input rendered as text |
| Secret/log leakage | Auth and telemetry | No browser persistence of secrets, redacted logs, correlation ID | Token absent from log and public artifact |
| RLS bypass by table owner | Migration/runtime roles | Runtime non-owner role and FORCE RLS on tenant tables | Direct SQL under runtime role cannot cross tenants |
| Replay/duplicate publication | API → database | Idempotency key and transaction/unique constraints | Same key cannot create two builds |

Residual risks: the local issuer is a development adapter, not production
identity; AI55 approval is external to this code; a synthetic demo is not a
customer validation. Revisit before any public cloud deployment.
