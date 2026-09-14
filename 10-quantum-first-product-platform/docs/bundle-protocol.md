# AI-to-Software ProductEvidenceBundle boundary

Import is disabled until a human-approved source artifact exists. A future
candidate must carry `schema_version`, `producer_project`, `producer_commit`,
`bundle_hash`, `artifact_index`, `evidence_index`, `methodology_versions`,
`review_status` and `generated_at`. Validate schema and content SHA-256,
artifact count/size, relative paths and provenance. Reject incompatible,
unreviewed or tampered bundles; do not adapt them silently.

The AI repository remains the research owner. This repository may consume
approved, versioned *content* only, never its code, database, credentials or
execution state. An imported claim stays in review until a Software-side
reviewer decides whether it is fit for this product version. A hash proves
integrity, not truth or human approval.

Current source boundary: Project 55's candidate handoff is
`pending_human_review`; no business thesis or customer assertion is imported.
