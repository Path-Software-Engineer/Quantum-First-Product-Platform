# Versioned catalog and one-pager publishing

Sprint 1 implements an evidence-led publishing path. Product content remains
tenant-owned; the public projection is created only after review and contains
no organization, workspace or actor identifiers.

## State flow

```text
product → draft version → capabilities/use cases
        → evidence reference → owned claim
        → explicit hypothetical commercial scenario
        → submit → distinct reviewer decision
        → version approval → publication
        → immutable one-pager snapshot + SHA-256
```

The claim owner cannot review their own claim. Approval fails when any claim is
not approved, when no approved claim exists, or when the version lacks a
commercial scenario explicitly marked hypothetical. Published versions cannot
be edited by the catalog write endpoints.

## API boundary

Every private route is rooted at
`/api/v1/workspaces/{workspaceId}` and requires a verified JWT plus an active
workspace membership. The implemented routes are:

- `POST|GET /products`
- `GET /products/{productId}`
- `POST /products/{productId}/versions`
- `POST|GET /product-versions/{versionId}/capabilities`
- `POST|GET /product-versions/{versionId}/use-cases`
- `POST /product-versions/{versionId}/evidence`
- `POST|GET /product-versions/{versionId}/claims`
- `POST /product-versions/{versionId}/commercial-scenarios`
- `POST /product-versions/{versionId}/submit`
- `POST /claims/{claimId}/review`
- `POST /product-versions/{versionId}/approve`
- `POST /product-versions/{versionId}/publish`
- `POST /product-versions/{versionId}/one-pager-builds`
- `GET /one-pager-builds/{buildId}`
- `GET /audit-events` (reviewer/owner)

The only anonymous artifact route is
`GET /api/v1/public/one-pagers/{buildId}`. It reads a projection written after
publication; it cannot read drafts or tenant tables.

## Portal integration

The Docusaurus route `/one-pager?build={buildId}` requests the public artifact
from `P10_PUBLIC_API_URL` (default `http://127.0.0.1:8080`). It renders the
version, capabilities and limitations, approved claims with their evidence,
commercial assumptions, build ID and source SHA-256. Without a build ID it
shows an explicit empty state; it never substitutes fabricated demo content.

## Persistence and tests

- `0002_product_catalog.sql` creates the versioned catalog with composite
  tenant foreign keys and forced RLS.
- `0003_claims_one_pagers.sql` creates evidence, claims, commercial scenarios,
  immutable build records, public projections and audit events.
- Unit and HTTP tests cover input boundaries, permissions, API prefix and the
  anonymous published-artifact route.
- The disposable PostgreSQL suite exercises the complete JWT → RBAC → RLS →
  catalog → independent review → publish → build journey when Docker is
  available.
