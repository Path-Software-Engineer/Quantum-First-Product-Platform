# Sprint 1 implementation plan

This is a dependency plan, not an assertion that fourteen calendar days or
daily cycles have been completed.

1. Lock the language: organization, workspace, membership, product, version,
   capability, use case, claim, evidence reference, approval and one-pager
   build. Define transitions and a versioned HTTP contract.
2. Bootstrap one npm-workspace lockfile with Docusaurus/React portal and NestJS
   API. Add PostgreSQL migrations, health checks and a repeatable local gate.
3. Implement tenant resolution, JWT validation, deny-by-default RBAC and
   database row-level security. Test both allowed and cross-tenant paths.
4. Implement catalog, claim review and immutable one-pager generation from
   structured source data. Keep pricing/licensing as hypothesis scenarios.
5. Join portal, API and database in a real smoke flow; check responsive and
   keyboard access; document evidence, tag `v0.1.0-sprint-01-quantum-first-company-one-pager`
   only after the map's Sprint 1 Definition of Done passes.

Sprint 2 cannot be declared open merely because this plan exists. At its
start, review any P56 ProductEvidenceBundle for compatibility and approval;
rejected or absent bundles remain outside the product.

## Verification gates

- Exact lockfile install, dependency audit, strict TypeScript, lint and tests.
- Migration up on clean PostgreSQL plus repeat/idempotency and tenant policy
  checks under a non-bypass runtime role.
- Contract examples, API authorization negatives and one-pager reproducibility.
- Browser paths at mobile and desktop widths, keyboard focus and reduced motion.
- `git diff --check`, scoped staging, release ancestry and remote tag check.

## Open decisions

- AI55 handoff requires explicit human review before any business thesis is
  adopted. Until then the public page can show only approved local content or
  a clearly synthetic demonstration.
- Final hosting and OIDC provider remain undecided; development adapters are
  not production authentication.
