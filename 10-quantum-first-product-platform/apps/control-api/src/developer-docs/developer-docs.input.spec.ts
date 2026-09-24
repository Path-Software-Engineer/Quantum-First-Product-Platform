import { BadRequestException } from '@nestjs/common';
import {
  parseApiDocument,
  parseEndpoint,
  parseError,
} from './developer-docs.input.js';

describe('developer docs input', () => {
  it('accepts bounded metadata and structured schemas', () => {
    expect(
      parseApiDocument(
        {
          apiName: 'Synthetic API',
          apiVersion: 'v1',
          description: 'Integration-only contract.',
          authModel: 'Bearer token',
          baseUrl: 'https://api.example.invalid',
          rateLimits: '60 requests per minute (declared)',
          serviceStatus: 'beta',
        },
        'version-id',
      ),
    ).toMatchObject({ apiName: 'Synthetic API', serviceStatus: 'beta' });
    expect(
      parseEndpoint({
        method: 'POST',
        path: '/v1/jobs',
        summary: 'Create a job',
        description: 'Creates a synthetic job.',
        tags: ['jobs'],
        useCase: 'Submit bounded work.',
        parameters: [],
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' },
      }),
    ).toMatchObject({ method: 'POST', path: '/v1/jobs' });
  });

  it('rejects unsafe URLs, paths and invalid error statuses', () => {
    expect(() =>
      parseApiDocument(
        {
          apiName: 'API',
          apiVersion: 'v1',
          description: 'Description',
          authModel: 'Bearer',
          baseUrl: 'javascript:alert(1)',
          rateLimits: 'Unknown',
          serviceStatus: 'beta',
        },
        'version-id',
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      parseEndpoint({
        method: 'GET',
        path: 'jobs',
        summary: 'Jobs',
        description: 'Description',
        tags: ['jobs'],
        useCase: 'Use case',
        parameters: [],
        requestSchema: {},
        responseSchema: {},
      }),
    ).toThrow('path must start with /');
    expect(() =>
      parseError({
        errorCode: 'BAD',
        httpStatus: 200,
        message: 'Bad',
        cause: 'Cause',
        example: {},
        suggestedSolution: 'Fix',
        isCommon: true,
      }),
    ).toThrow('httpStatus');
  });
});
