# Local tenancy persistence

`migrations/0001_tenancy.sql` creates organization, workspace and membership
tables, a non-login runtime role, composite tenant keys and forced PostgreSQL
row-level security. It is a forward-only first migration. Apply it once using
a separate migration-owner connection; never use that owner for API traffic.

The API runtime login must inherit `p10_runtime`, must not own tenant tables
and must not have `BYPASSRLS`. Before each tenant-scoped operation, the
application must verify the actor's membership and open a transaction with
`set_config('app.organization_id', verifiedOrganizationId, true)`. The
transaction-local setting clears on commit/rollback. RLS is defense in depth,
not a substitute for authorization or explicit organization filters.

Run the isolated integration test from the project directory:

```powershell
.\scripts\run-tenancy-integration.ps1
```

It starts a disposable local PostgreSQL 17.10 container, applies the migration
there, exercises reads and writes under `p10_runtime`, and removes the
container. It does not connect to Neon or Azure. No user data is migrated.
