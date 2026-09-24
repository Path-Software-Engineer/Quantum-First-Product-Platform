export type Actor = Readonly<{
  subjectId: string;
  organizationId: string;
  issuer: string;
}>;

export const roles = ['owner', 'editor', 'reviewer', 'viewer'] as const;
export type Role = (typeof roles)[number];

export enum Permission {
  CatalogRead = 'catalog:read',
  CatalogWrite = 'catalog:write',
  ClaimSubmit = 'claim:submit',
  ClaimReview = 'claim:review',
  OnePagerPublish = 'onepager:publish',
  PqcRead = 'pqc:read',
  PqcWrite = 'pqc:write',
  PqcReview = 'pqc:review',
  PqcPublish = 'pqc:publish',
  DeveloperDocsRead = 'developer-docs:read',
  DeveloperDocsWrite = 'developer-docs:write',
  DeveloperDocsReview = 'developer-docs:review',
  DeveloperDocsPublish = 'developer-docs:publish',
}

export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  owner: Object.values(Permission),
  editor: [
    Permission.CatalogRead,
    Permission.CatalogWrite,
    Permission.ClaimSubmit,
    Permission.PqcRead,
    Permission.PqcWrite,
    Permission.DeveloperDocsRead,
    Permission.DeveloperDocsWrite,
  ],
  reviewer: [
    Permission.CatalogRead,
    Permission.ClaimReview,
    Permission.OnePagerPublish,
    Permission.PqcRead,
    Permission.PqcReview,
    Permission.PqcPublish,
    Permission.DeveloperDocsRead,
    Permission.DeveloperDocsReview,
    Permission.DeveloperDocsPublish,
  ],
  viewer: [
    Permission.CatalogRead,
    Permission.PqcRead,
    Permission.DeveloperDocsRead,
  ],
};

export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
