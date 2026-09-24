export type EvidenceReference = Readonly<{
  evidenceId: string;
  versionId: string;
  title: string;
  sourceUri: string;
  sourceKind: 'primary' | 'standard' | 'internal';
  notes: string;
  createdBy: string;
}>;

export type ProductClaim = Readonly<{
  claimId: string;
  versionId: string;
  evidenceId: string;
  statement: string;
  ownerSubjectId: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedBy: string | null;
}>;

export type CommercialScenario = Readonly<{
  scenarioId: string;
  versionId: string;
  key: string;
  packaging: string;
  pricing: string;
  licensing: string;
  assumptions: string;
  isHypothetical: true;
}>;

export type CreateEvidence = Omit<
  EvidenceReference,
  'evidenceId' | 'versionId' | 'createdBy'
>;
export type CreateClaim = Pick<ProductClaim, 'evidenceId' | 'statement'>;
export type CreateScenario = Omit<
  CommercialScenario,
  'scenarioId' | 'versionId' | 'isHypothetical'
>;

export type OnePagerSnapshot = Readonly<{
  schemaVersion: 'p10.one-pager.v1';
  product: unknown;
  version: unknown;
  capabilities: readonly unknown[];
  useCases: readonly unknown[];
  claims: readonly unknown[];
  commercialScenarios: readonly unknown[];
}>;

export type OnePagerBuild = Readonly<{
  buildId: string;
  versionId: string;
  sourceSha256: string;
  sourceSnapshot: OnePagerSnapshot;
  createdBy: string;
  createdAt: string;
}>;
