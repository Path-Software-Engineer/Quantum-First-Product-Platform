export const maturityLevels = ['initial', 'developing', 'managed'] as const;
export const evidenceBases = [
  'self_reported',
  'document_review',
  'technical_observation',
] as const;
export const algorithms = ['RSA', 'ECC', 'HYBRID', 'OTHER', 'UNKNOWN'] as const;
export const levels = ['low', 'medium', 'high'] as const;
export const exposures = ['internal', 'partner', 'internet'] as const;
export const retentions = ['short', 'medium', 'long'] as const;

export type Assessment = Readonly<{
  assessmentId: string;
  versionId: string;
  title: string;
  industry: string;
  criticalSystems: string;
  sensitiveData: string;
  maturity: (typeof maturityLevels)[number];
  primaryConcern: string;
  scope: string;
  assumptions: string;
  evidenceBasis: (typeof evidenceBases)[number];
  status: 'draft' | 'reviewed';
  createdBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
}>;

export type InventoryItem = Readonly<{
  itemId: string;
  assessmentId: string;
  systemName: string;
  algorithm: (typeof algorithms)[number];
  protocol: string;
  dataClass: string;
  criticality: (typeof levels)[number];
  exposure: (typeof exposures)[number];
  retention: (typeof retentions)[number];
  cryptoAgility: (typeof levels)[number];
  evidenceNote: string;
  riskScore: number;
  riskTier: (typeof levels)[number];
  scoreFactors: Readonly<
    Record<'criticality' | 'exposure' | 'retention' | 'cryptoAgility', number>
  >;
}>;

export type Recommendation = Readonly<{
  recommendationId: string;
  assessmentId: string;
  itemId: string;
  action: string;
  priority: (typeof levels)[number];
  dependency: string;
  limitation: string;
}>;

export type RoadmapPhase = Readonly<{
  phaseId: string;
  assessmentId: string;
  phaseNumber: number;
  title: string;
  objective: string;
  exitCriteria: string;
  operationalRisks: string;
}>;

export type ReportSnapshot = Readonly<{
  schemaVersion: 'p10.pqc-report.v1';
  disclaimer: string;
  scoreRubric: string;
  assessment: Omit<Assessment, 'createdBy' | 'reviewedBy'>;
  executiveSummary: Readonly<{
    inventoryItems: number;
    highPriorityItems: number;
    highestTier: (typeof levels)[number];
    nextAction: string;
  }>;
  inventory: InventoryItem[];
  recommendations: Recommendation[];
  roadmap: RoadmapPhase[];
}>;

export type ReportBuild = Readonly<{
  buildId: string;
  assessmentId: string;
  sourceSnapshot: ReportSnapshot;
  sourceSha256: string;
  createdAt: string;
  publishedAt?: string;
}>;

export type CreateAssessment = Omit<
  Assessment,
  'assessmentId' | 'status' | 'createdBy' | 'reviewedBy' | 'reviewNote'
>;
export type CreateInventoryItem = Omit<
  InventoryItem,
  'itemId' | 'assessmentId' | 'riskScore' | 'riskTier' | 'scoreFactors'
>;
export type CreateRecommendation = Omit<
  Recommendation,
  'recommendationId' | 'assessmentId'
>;
export type CreateRoadmapPhase = Omit<RoadmapPhase, 'phaseId' | 'assessmentId'>;
