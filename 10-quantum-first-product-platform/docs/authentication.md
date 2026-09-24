# Identity and workspace authorization

The API authenticates bearer JWTs, then obtains authorization from an active
PostgreSQL membership. It does not trust a role, workspace or permission sent
in a request body or copied from an unverified token.

## Token contract

Required verified claims are `sub`, `organization_id`, `iss`, `aud`, `iat` and
`exp`. Subject identifiers are bounded to the membership schema and
`organization_id` must be a UUID. Verification pins the expected issuer,
audience and algorithms and limits token age to twenty minutes.

Development may configure a local `HS256` secret of at least 32 characters.
Production explicitly rejects that mode and requires a configured HTTPS JWKS
URL, with `RS256` or `ES256`. Errors returned to clients remain generic and do
not expose signatures, tokens or provider details.

## Authorization contract

The route workspace is validated as a UUID. The signed organization and
verified subject are used to query an active membership inside a transaction
whose organization setting activates PostgreSQL RLS. Missing and suspended
memberships deny access.

| Role | Permissions |
| --- | --- |
| owner | all current catalog, claim-review and publication permissions |
| editor | read/write catalog and submit claims |
| reviewer | read catalog, review claims and publish an approved one-pager |
| viewer | read catalog only |

This matrix authorizes capabilities, not individual business decisions. A
future claim-review service must additionally enforce that the reviewer is not
the claim owner and that approval binds to the exact content/evidence hash.

## Current verification

- Unit tests cover valid identity, wrong audience, missing claims, local-secret
  production rejection and role permission positives/negatives.
- HTTP tests cover public health routes, missing tokens, allowed membership,
  cross-workspace denial and malformed workspace identifiers.
- The real PostgreSQL integration suite contains JWT → guard → membership →
  RLS acceptance and cross-tenant denial cases. Re-run it when Docker Server is
  healthy; its latest attempted run was blocked before test execution because
  Docker Desktop did not start within its timeout.
