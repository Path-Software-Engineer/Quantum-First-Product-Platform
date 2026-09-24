import { renderMarkdown } from './markdown.js';
import type { DeveloperDocsSnapshot } from './developer-docs.model.js';

describe('developer docs markdown', () => {
  it('renders a deterministic, complete developer reference', () => {
    const snapshot = {
      schemaVersion: 'p10.developer-docs.v1',
      document: {
        documentId: 'doc',
        versionId: 'version',
        apiName: 'Synthetic Jobs',
        apiVersion: 'v1',
        description: 'A synthetic contract.',
        authModel: 'Bearer',
        baseUrl: 'https://api.example.invalid',
        rateLimits: '60/minute',
        serviceStatus: 'beta',
        status: 'reviewed',
        reviewNote: 'Reviewed.',
      },
      endpoints: [
        {
          endpointId: 'endpoint',
          documentId: 'doc',
          method: 'POST',
          path: '/v1/jobs',
          summary: 'Create job',
          description: 'Creates a job.',
          tags: ['jobs'],
          useCase: 'Run synthetic work.',
          parameters: [],
          requestSchema: { type: 'object' },
          responseSchema: { type: 'object' },
        },
      ],
      errors: [
        {
          errorId: 'error',
          documentId: 'doc',
          errorCode: 'INVALID_JOB',
          httpStatus: 422,
          message: 'Job invalid',
          cause: 'The body did not match.',
          example: { code: 'INVALID_JOB' },
          suggestedSolution: 'Correct the body.',
          isCommon: true,
        },
      ],
      examples: [
        {
          exampleId: 'example',
          documentId: 'doc',
          language: 'curl',
          title: 'Create a job',
          requestSample: 'curl https://api.example.invalid/v1/jobs',
          responseSample: '{"id":"job"}',
          notes: 'Synthetic example.',
        },
      ],
      quickstart: {
        installation: 'No SDK required.',
        firstCall: 'curl https://api.example.invalid/health',
        expectedResult: 'HTTP 200.',
        nextStep: 'Create a job.',
        troubleshooting: 'Verify the token.',
      },
      limitations: 'Generated reference; behavior is not verified.',
    } satisfies DeveloperDocsSnapshot;
    const first = renderMarkdown(snapshot);
    expect(renderMarkdown(snapshot)).toBe(first);
    expect(first).toContain('# Synthetic Jobs API');
    expect(first).toContain('### POST /v1/jobs');
    expect(first).toContain('### 422 INVALID_JOB (common)');
    expect(first).toContain('## Quickstart');
  });
});
