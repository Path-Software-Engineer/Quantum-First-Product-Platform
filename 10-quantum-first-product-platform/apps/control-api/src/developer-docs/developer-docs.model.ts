export const serviceStatuses = [
  'concept',
  'beta',
  'stable',
  'deprecated',
] as const;
export const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const exampleLanguages = ['curl', 'python'] as const;

export type JsonObject = Record<string, unknown>;

export type ApiDocument = Readonly<{
  documentId: string;
  versionId: string;
  apiName: string;
  apiVersion: string;
  description: string;
  authModel: string;
  baseUrl: string;
  rateLimits: string;
  serviceStatus: (typeof serviceStatuses)[number];
  status: 'draft' | 'reviewed';
  createdBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
}>;

export type ApiEndpoint = Readonly<{
  endpointId: string;
  documentId: string;
  method: (typeof httpMethods)[number];
  path: string;
  summary: string;
  description: string;
  tags: string[];
  useCase: string;
  parameters: JsonObject[];
  requestSchema: JsonObject;
  responseSchema: JsonObject;
}>;

export type ApiError = Readonly<{
  errorId: string;
  documentId: string;
  errorCode: string;
  httpStatus: number;
  message: string;
  cause: string;
  example: JsonObject;
  suggestedSolution: string;
  isCommon: boolean;
}>;

export type ApiExample = Readonly<{
  exampleId: string;
  documentId: string;
  language: (typeof exampleLanguages)[number];
  title: string;
  requestSample: string;
  responseSample: string;
  notes: string;
}>;

export type Quickstart = Readonly<{
  installation: string;
  firstCall: string;
  expectedResult: string;
  nextStep: string;
  troubleshooting: string;
}>;

export type DeveloperDocsSnapshot = Readonly<{
  schemaVersion: 'p10.developer-docs.v1';
  document: Omit<ApiDocument, 'createdBy' | 'reviewedBy'>;
  endpoints: ApiEndpoint[];
  errors: ApiError[];
  examples: ApiExample[];
  quickstart: Quickstart;
  limitations: string;
}>;

export type DeveloperDocsBuild = Readonly<{
  buildId: string;
  documentId: string;
  sourceSnapshot: DeveloperDocsSnapshot;
  markdown: string;
  sourceSha256: string;
  createdAt: string;
  publishedAt?: string;
}>;

export type CreateApiDocument = Omit<
  ApiDocument,
  'documentId' | 'status' | 'createdBy' | 'reviewedBy' | 'reviewNote'
>;
export type CreateApiEndpoint = Omit<ApiEndpoint, 'endpointId' | 'documentId'>;
export type CreateApiError = Omit<ApiError, 'errorId' | 'documentId'>;
export type CreateApiExample = Omit<ApiExample, 'exampleId' | 'documentId'>;
