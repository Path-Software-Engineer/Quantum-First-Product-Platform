-- Synthetic, non-customer public projections for the scale-to-zero recruiter demo.
-- Tenant-owned source records are intentionally absent from this fixture.
INSERT INTO public_one_pagers (build_id, source_snapshot, source_sha256, published_at)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  $json${
    "schemaVersion": "p10.one-pager.v1",
    "product": {
      "displayName": "Quantum-First Product Platform",
      "summary": "A synthetic recruiter demo showing how reviewed product evidence becomes an immutable public artifact."
    },
    "version": {
      "versionNumber": 3,
      "changeSummary": "Adds evidence-bounded developer documentation and Azure release packaging."
    },
    "capabilities": [
      {
        "key": "tenant-governance",
        "title": "Tenant-scoped product governance",
        "description": "PostgreSQL row-level security, application authorization and immutable publication projections are exercised by the acceptance suite.",
        "maturity": "available",
        "limitations": "This hosted dataset is synthetic and resets after the Container App scales to zero."
      },
      {
        "key": "evidence-publication",
        "title": "Evidence-led publication",
        "description": "Claims, PQC planning and developer documentation cross explicit review boundaries before publication.",
        "maturity": "available",
        "limitations": "No customer adoption, quantum advantage or security certification is claimed."
      }
    ],
    "useCases": [
      {
        "key": "review-before-release",
        "actor": "Product reviewer",
        "problem": "Marketing and technical claims can drift away from their evidence.",
        "workflow": "Review structured claims, limitations and source references before generating a public build.",
        "expected_outcome": "A versioned artifact with a stable SHA-256 provenance marker.",
        "evidence_status": "sourced"
      }
    ],
    "claims": [
      {
        "statement": "The repository acceptance suite verifies tenant RLS, HTTP contracts and browser accessibility for this implementation.",
        "evidence_title": "Project 10 versioned source and quality gate",
        "source_uri": "https://github.com/Path-Software-Engineer/Quantum-First-Product-Platform",
        "source_kind": "internal",
        "notes": "This statement describes repository evidence only; it is not a production certification."
      }
    ],
    "commercialScenarios": [
      {
        "key": "recruiter-demo",
        "packaging": "Hosted synthetic demonstration",
        "pricing": "No commercial price is offered",
        "licensing": "Portfolio evaluation only",
        "assumptions": "The environment may cold-start and all demo data may be recreated.",
        "is_hypothetical": true
      }
    ]
  }$json$::jsonb,
  repeat('a', 64),
  '2026-09-24T00:00:00Z'
);

INSERT INTO public_pqc_reports (build_id, source_snapshot, source_sha256, published_at)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  $json${
    "schemaVersion": "p10.pqc-report.v1",
    "disclaimer": "Synthetic planning evidence only. This is not a security audit, certification or migration guarantee.",
    "scoreRubric": "Risk score combines criticality, exposure, retention and crypto agility on a bounded 4–12 scale.",
    "assessment": {
      "title": "Synthetic SaaS PQC readiness baseline",
      "industry": "Software",
      "maturity": "developing",
      "primaryConcern": "Long-lived sensitive records protected by public-key cryptography.",
      "scope": "One fictional public API and its signing boundary.",
      "assumptions": "Inventory values are illustrative and not measurements from a customer system.",
      "evidenceBasis": "self_reported",
      "reviewNote": "Approved as a transparent portfolio fixture."
    },
    "executiveSummary": {
      "inventoryItems": 1,
      "highPriorityItems": 1,
      "highestTier": "high",
      "nextAction": "Confirm cryptographic ownership and establish an algorithm-agility test plan."
    },
    "inventory": [
      {
        "itemId": "20000000-0000-4000-8000-000000000001",
        "systemName": "Synthetic API signing boundary",
        "algorithm": "RSA",
        "protocol": "TLS 1.3",
        "dataClass": "Fictional long-lived business records",
        "evidenceNote": "Declared solely for this synthetic demonstration.",
        "riskScore": 10,
        "riskTier": "high",
        "scoreFactors": {"criticality": 3, "exposure": 3, "retention": 3, "cryptoAgility": 1}
      }
    ],
    "recommendations": [
      {
        "recommendationId": "20000000-0000-4000-8000-000000000002",
        "action": "Inventory certificate, signing and key-management dependencies before selecting migration algorithms.",
        "priority": "high",
        "dependency": "Named system owner and reproducible integration tests.",
        "limitation": "Algorithm selection requires current standards and implementation-specific validation."
      }
    ],
    "roadmap": [
      {"phaseId":"20000000-0000-4000-8000-000000000011","phaseNumber":1,"title":"Discover","objective":"Confirm assets and owners.","exitCriteria":"A reviewed cryptographic inventory exists.","operationalRisks":"Undocumented dependencies remain possible."},
      {"phaseId":"20000000-0000-4000-8000-000000000012","phaseNumber":2,"title":"Prioritize","objective":"Rank migration boundaries.","exitCriteria":"Risk owners accept the ordering.","operationalRisks":"Scores depend on declared evidence."},
      {"phaseId":"20000000-0000-4000-8000-000000000013","phaseNumber":3,"title":"Prototype","objective":"Exercise algorithm agility in isolation.","exitCriteria":"Compatibility evidence is reproducible.","operationalRisks":"Prototype behavior may not represent production load."},
      {"phaseId":"20000000-0000-4000-8000-000000000014","phaseNumber":4,"title":"Transition","objective":"Roll out behind reversible controls.","exitCriteria":"Rollback and observability are verified.","operationalRisks":"Mixed-mode interoperability needs monitoring."},
      {"phaseId":"20000000-0000-4000-8000-000000000015","phaseNumber":5,"title":"Operate","objective":"Track standards and implementation drift.","exitCriteria":"Ownership and recurring review are funded.","operationalRisks":"External standards and vendor support can change."}
    ]
  }$json$::jsonb,
  repeat('b', 64),
  '2026-09-24T00:00:00Z'
);

INSERT INTO public_api_docs (build_id, source_snapshot, markdown, source_sha256, published_at)
VALUES (
  '10000000-0000-4000-8000-000000000003',
  $json${
    "schemaVersion": "p10.developer-docs.v1",
    "document": {
      "apiName": "Quantum-First Control API",
      "apiVersion": "v1",
      "description": "A contract-first API for tenant-governed product evidence and public immutable projections.",
      "authModel": "Bearer JWT for private workspace routes; public artifact routes require no token.",
      "baseUrl": "/api/v1",
      "rateLimits": "Recruiter demo: bounded by Azure Container Apps scale 0–1.",
      "serviceStatus": "beta"
    },
    "endpoints": [
      {
        "endpointId": "30000000-0000-4000-8000-000000000001",
        "method": "GET",
        "path": "/api/v1/public/developer-docs/{buildId}",
        "summary": "Read a published documentation build",
        "description": "Returns only the reviewed public projection and its provenance.",
        "tags": ["Public artifacts"],
        "useCase": "Render recruiter-safe API documentation without exposing tenant drafts."
      }
    ],
    "errors": [
      {
        "errorId": "30000000-0000-4000-8000-000000000002",
        "httpStatus": 404,
        "errorCode": "NOT_FOUND",
        "message": "Published documentation build was not found.",
        "cause": "The build identifier is absent or has not crossed the publication boundary.",
        "suggestedSolution": "Use the recruiter demo link or a known published build UUID.",
        "isCommon": true
      }
    ],
    "examples": [
      {
        "exampleId": "30000000-0000-4000-8000-000000000003",
        "language": "curl",
        "title": "Read the synthetic public documentation",
        "requestSample": "curl /api/v1/public/developer-docs/10000000-0000-4000-8000-000000000003",
        "responseSample": "{\"buildId\":\"10000000-0000-4000-8000-000000000003\"}",
        "notes": "Use the deployed origin before the relative path. No bearer token is required."
      }
    ],
    "quickstart": {
      "installation": "No SDK is required for public projections.",
      "firstCall": "curl https://DEPLOYED_ORIGIN/health/ready",
      "expectedResult": "HTTP 200 with database connected.",
      "nextStep": "Open /swagger/ for the interactive contract.",
      "troubleshooting": "A first request can cold-start the scale-to-zero Container App. Retry after several seconds."
    },
    "limitations": "The dataset is synthetic, resets after scale-to-zero and does not grant access to tenant-owned write routes."
  }$json$::jsonb,
  $markdown$# Quantum-First Control API

This synthetic recruiter document is generated from reviewed structured metadata.

## Public endpoint

`GET /api/v1/public/developer-docs/{buildId}`

No bearer token is required for a published projection. Private workspace routes remain protected.
$markdown$,
  repeat('c', 64),
  '2026-09-24T00:00:00Z'
);

