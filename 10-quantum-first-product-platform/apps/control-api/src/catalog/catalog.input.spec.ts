import { BadRequestException } from '@nestjs/common';
import {
  parseCapability,
  parseProduct,
  parseUseCase,
} from './catalog.input.js';

describe('catalog input', () => {
  it('normalizes a valid product without accepting arbitrary fields', () => {
    expect(
      parseProduct({
        slug: 'quantum-planner',
        displayName: ' Quantum Planner ',
        summary: ' Evidence-led planning. ',
        ignored: 'not persisted',
      }),
    ).toEqual({
      slug: 'quantum-planner',
      displayName: 'Quantum Planner',
      summary: 'Evidence-led planning.',
    });
  });

  it('requires a limitation for every capability', () => {
    expect(() =>
      parseCapability({
        key: 'scenario-builder',
        title: 'Scenario builder',
        description: 'Builds scenarios.',
        maturity: 'planned',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported evidence claims on use cases', () => {
    expect(() =>
      parseUseCase({
        key: 'portfolio-planning',
        actor: 'Product leader',
        problem: 'Needs traceability.',
        workflow: 'Review evidence.',
        expectedOutcome: 'Bounded decision.',
        evidenceStatus: 'proven',
      }),
    ).toThrow('evidenceStatus must be one of: hypothesis, sourced');
  });
});
