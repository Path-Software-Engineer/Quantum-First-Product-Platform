import { BadRequestException } from '@nestjs/common';
import {
  parseClaim,
  parseEvidence,
  parseReview,
  parseScenario,
} from './publishing.input.js';

describe('publishing input', () => {
  it('accepts an explicit evidence reference', () => {
    expect(
      parseEvidence({
        title: 'Standard reference',
        sourceUri: 'https://example.com/reference',
        sourceKind: 'standard',
        notes: 'Scope and applicability must be reviewed.',
      }),
    ).toMatchObject({ sourceKind: 'standard' });
  });

  it('rejects non-HTTP evidence locations', () => {
    expect(() =>
      parseEvidence({
        title: 'Unsafe reference',
        sourceUri: 'file:///secret',
        sourceKind: 'internal',
        notes: 'Invalid.',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires claims to reference evidence by UUID', () => {
    expect(() =>
      parseClaim({ evidenceId: 'missing', statement: 'Unsupported claim.' }),
    ).toThrow('evidenceId must be a UUID');
  });

  it('restricts review decisions and makes commercial assumptions explicit', () => {
    expect(() => parseReview({ decision: 'publish', note: 'No.' })).toThrow(
      BadRequestException,
    );
    expect(
      parseScenario({
        key: 'pilot-only',
        packaging: 'Pilot package',
        pricing: 'Hypothetical pricing',
        licensing: 'Evaluation license',
        assumptions: 'Subject to validation',
      }),
    ).toEqual({
      key: 'pilot-only',
      packaging: 'Pilot package',
      pricing: 'Hypothetical pricing',
      licensing: 'Evaluation license',
      assumptions: 'Subject to validation',
    });
  });
});
