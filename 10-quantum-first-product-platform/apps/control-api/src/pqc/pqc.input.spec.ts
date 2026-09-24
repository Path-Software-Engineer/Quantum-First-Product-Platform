import {
  parseAssessment,
  parseInventoryItem,
  parseRoadmapPhase,
} from './pqc.input.js';
import { score } from './pqc.repository.js';

describe('PQC input boundary', () => {
  it('accepts a bounded assessment without treating it as an audit', () => {
    const result = parseAssessment(
      {
        title: 'Synthetic readiness review',
        industry: 'Synthetic financial services',
        criticalSystems: 'Declared identity gateway',
        sensitiveData: 'Declared long-lived records',
        maturity: 'initial',
        primaryConcern: 'Prioritize cryptographic discovery',
        scope: 'User-declared systems only',
        assumptions: 'No active scanner or production access',
        evidenceBasis: 'self_reported',
      },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(result.evidenceBasis).toBe('self_reported');
  });

  it('rejects unbounded scoring factors', () => {
    expect(() =>
      parseInventoryItem({
        systemName: 'Gateway',
        algorithm: 'RSA',
        protocol: 'TLS',
        dataClass: 'Records',
        criticality: 'critical',
        exposure: 'internet',
        retention: 'long',
        cryptoAgility: 'low',
        evidenceNote: 'Synthetic declaration',
      }),
    ).toThrow('criticality must be one of');
  });

  it('enforces the five-phase roadmap boundary', () => {
    expect(() =>
      parseRoadmapPhase({
        phaseNumber: 6,
        title: 'Invalid',
        objective: 'Invalid',
        exitCriteria: 'Invalid',
        operationalRisks: 'Invalid',
      }),
    ).toThrow('phaseNumber must be an integer from 1 to 5');
  });

  it('scores all four factors deterministically and exposes the factor values', () => {
    expect(
      score({
        systemName: 'Gateway',
        algorithm: 'RSA',
        protocol: 'TLS',
        dataClass: 'Records',
        criticality: 'high',
        exposure: 'internet',
        retention: 'long',
        cryptoAgility: 'low',
        evidenceNote: 'Synthetic declaration',
      }),
    ).toEqual({
      riskScore: 12,
      riskTier: 'high',
      scoreFactors: {
        criticality: 3,
        exposure: 3,
        retention: 3,
        cryptoAgility: 3,
      },
    });
  });
});
