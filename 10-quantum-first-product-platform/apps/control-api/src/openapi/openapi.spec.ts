import { readFile } from 'node:fs/promises';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI } from 'openapi-types';

const contractUrl = new URL(
  '../../../../contracts/openapi.json',
  import.meta.url,
);

describe('versioned OpenAPI contract', () => {
  it('is a valid, fully resolvable OpenAPI document with unique operation IDs', async () => {
    const document = JSON.parse(
      await readFile(contractUrl, 'utf8'),
    ) as OpenAPI.Document;
    await SwaggerParser.validate(document);
    const operationIds = Object.values(document.paths ?? {}).flatMap((path) =>
      Object.values(path ?? {})
        .filter(
          (operation) =>
            operation &&
            typeof operation === 'object' &&
            'operationId' in operation,
        )
        .map((operation) =>
          String((operation as OpenAPI.Operation).operationId),
        ),
    );
    expect(operationIds.sort()).toEqual(
      [
        'approveProductVersion',
        'buildOnePager',
        'buildPqcReport',
        'createCapability',
        'createClaim',
        'createCommercialScenario',
        'createEvidence',
        'createProduct',
        'createProductVersion',
        'createPqcAssessment',
        'createCryptoInventoryItem',
        'createPqcRecommendation',
        'createPqcRoadmapPhase',
        'createUseCase',
        'getLiveness',
        'getPrivateOnePagerBuild',
        'getProduct',
        'getPublishedOnePager',
        'getPublishedPqcReport',
        'getPqcAssessment',
        'getReadiness',
        'getWorkspaceAccess',
        'listAuditEvents',
        'listCapabilities',
        'listClaims',
        'listProducts',
        'listUseCases',
        'publishProductVersion',
        'publishPqcReport',
        'reviewClaim',
        'reviewPqcAssessment',
        'submitProductVersion',
      ].sort(),
    );
  });

  it('keeps anonymous access limited to health and published projections', async () => {
    const document = JSON.parse(
      await readFile(contractUrl, 'utf8'),
    ) as OpenAPI.Document;
    const anonymous = Object.entries(document.paths ?? {}).flatMap(
      ([path, item]) =>
        Object.entries(item ?? {})
          .filter(([, operation]) =>
            Boolean(
              operation &&
              typeof operation === 'object' &&
              'security' in operation &&
              operation.security?.length === 0,
            ),
          )
          .map(() => path),
    );
    expect(anonymous.sort()).toEqual([
      '/api/v1/public/one-pagers/{buildId}',
      '/api/v1/public/pqc-reports/{buildId}',
      '/health/live',
      '/health/ready',
    ]);
  });
});
