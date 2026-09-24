# Sprint 2 — PQC assessment and report contract

## Build spec

- Goal: turn declared cryptographic inventory into a traceable, reviewed PQC
  readiness report without presenting the output as an audit or certification.
- Users: security leads author assessments; independent reviewers approve the
  evidence boundary; executives read the published projection.
- Must have: customer context, RSA/ECC inventory, deterministic risk scoring,
  executive summary, recommendation cards, five-phase roadmap, immutable build,
  SHA-256 provenance, tenant isolation and an accessible public viewer.
- Out of scope: active scanning, cryptographic discovery, compliance
  certification, exploitability prediction, vendor selection and real customer
  data.
- Constraints: NestJS, PostgreSQL RLS, Docusaurus/React, existing JWT/RBAC,
  synthetic fixtures only and no unsupported quantum-security claims.
- Assumptions: inventory entries are user-declared and their evidence notes are
  reviewed; scores prioritize follow-up and do not estimate breach probability.

## Explainable score

Each inventory item receives four integer factors: criticality, exposure, data
retention and inverse crypto agility. Each factor is 1–3; total score is 4–12.
Scores 4–6 are low, 7–9 medium and 10–12 high. Every report exposes the factors
and this rubric. Color is never the only indication of tier.

Algorithm labels identify where RSA or ECC was declared; they do not prove that
a system is exploitable, incorrectly configured or non-compliant.
