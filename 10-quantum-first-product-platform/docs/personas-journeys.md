# Personas and initial journeys

These are design archetypes, not interviewed users.

| Actor | Need | Authorized journey | Failure state |
| --- | --- | --- | --- |
| Product owner | Define a bounded offer | Create workspace → product → draft version → capabilities/use cases | Cannot approve own claims alone |
| Evidence reviewer | Challenge published statements | Inspect sources and limitations → approve or reject claims/version | Missing source or stale review blocks publication |
| Security lead | Judge a proposed readiness offer | Read published one-pager, scope, limitations and provenance | No certification or invented risk score shown |
| Developer | Understand future API product | Read contract-backed docs in a later sprint | No fake live endpoint or secret in public UI |
| Technical recruiter | Inspect engineering evidence | Open public demo and see version, tests and synthetic label | Private workspace data and dev tokens remain hidden |

Primary Sprint 1 path: product owner → draft → reviewer decision → publish →
public visitor. Negative path: actor from workspace B guesses workspace A's
identifiers and receives no data or mutation capability.
