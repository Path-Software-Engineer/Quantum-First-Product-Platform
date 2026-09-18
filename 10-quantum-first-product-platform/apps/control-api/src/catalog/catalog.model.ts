export const capabilityMaturities = [
  'hypothesis',
  'planned',
  'available',
  'retired',
] as const;
export type CapabilityMaturity = (typeof capabilityMaturities)[number];

export const evidenceStatuses = ['hypothesis', 'sourced'] as const;
export type EvidenceStatus = (typeof evidenceStatuses)[number];

export type Product = Readonly<{
  productId: string;
  slug: string;
  displayName: string;
  summary: string;
  createdBy: string;
  createdAt: string;
}>;

export type ProductVersion = Readonly<{
  productId: string;
  versionId: string;
  versionNumber: number;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'superseded';
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}>;

export type Capability = Readonly<{
  versionId: string;
  capabilityId: string;
  key: string;
  title: string;
  description: string;
  maturity: CapabilityMaturity;
  limitations: string;
  sortOrder: number;
}>;

export type UseCase = Readonly<{
  versionId: string;
  useCaseId: string;
  key: string;
  actor: string;
  problem: string;
  workflow: string;
  expectedOutcome: string;
  evidenceStatus: EvidenceStatus;
}>;

export type CreateProduct = Pick<Product, 'slug' | 'displayName' | 'summary'>;
export type CreateVersion = Pick<ProductVersion, 'changeSummary'>;
export type CreateCapability = Omit<Capability, 'versionId' | 'capabilityId'>;
export type CreateUseCase = Omit<UseCase, 'versionId' | 'useCaseId'>;
