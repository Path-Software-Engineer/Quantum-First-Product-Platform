# ADR-002 — tenancy and identity

Status: persistence/RLS implementation tested locally; identity, RBAC and
production credential validation remain proposed.

An authenticated actor has memberships scoped to an organization/workspace.
Every command resolves its workspace from route context and membership, never
from a body-supplied tenant ID. Default is deny. Roles distinguish owner,
editor, reviewer and viewer; approval requires a reviewer other than the
claim/version owner. API adapters verify JWT issuer, audience, signature and
expiry. A local issuer may exist for development only; production requires a
configured OIDC/JWKS adapter and cannot silently fall back to the local one.

PostgreSQL stores workspace identifiers on tenant-owned tables. Runtime queries
set a transaction-local workspace setting and use row-level security as
defense in depth; the runtime role must not own tables or have `BYPASSRLS`.
`FORCE ROW LEVEL SECURITY` protects against accidental owner bypass.
Repository filters remain mandatory, because RLS does not replace explicit
authorization or cover every operation. See the official
[PostgreSQL RLS documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
