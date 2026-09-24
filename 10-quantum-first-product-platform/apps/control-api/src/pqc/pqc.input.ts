import { BadRequestException } from '@nestjs/common';
import {
  algorithms,
  evidenceBases,
  exposures,
  levels,
  maturityLevels,
  retentions,
  type CreateAssessment,
  type CreateInventoryItem,
  type CreateRecommendation,
  type CreateRoadmapPhase,
} from './pqc.model.js';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  return value as Record<string, unknown>;
}

function text(input: Record<string, unknown>, key: string, max: number) {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new BadRequestException(
      `${key} must contain between 1 and ${max} characters`,
    );
  }
  return value.trim();
}

function choice<const T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  choices: T,
): T[number] {
  const value = String(input[key]);
  if (!choices.includes(value)) {
    throw new BadRequestException(
      `${key} must be one of: ${choices.join(', ')}`,
    );
  }
  return value as T[number];
}

function uuid(input: Record<string, unknown>, key: string) {
  const value = text(input, key, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BadRequestException(`${key} must be a UUID`);
  }
  return value;
}

export function parseAssessment(
  value: unknown,
  versionId: string,
): CreateAssessment {
  const input = record(value);
  return {
    versionId,
    title: text(input, 'title', 180),
    industry: text(input, 'industry', 120),
    criticalSystems: text(input, 'criticalSystems', 2_000),
    sensitiveData: text(input, 'sensitiveData', 2_000),
    maturity: choice(input, 'maturity', maturityLevels),
    primaryConcern: text(input, 'primaryConcern', 1_000),
    scope: text(input, 'scope', 2_000),
    assumptions: text(input, 'assumptions', 2_000),
    evidenceBasis: choice(input, 'evidenceBasis', evidenceBases),
  };
}

export function parseInventoryItem(value: unknown): CreateInventoryItem {
  const input = record(value);
  return {
    systemName: text(input, 'systemName', 180),
    algorithm: choice(input, 'algorithm', algorithms),
    protocol: text(input, 'protocol', 180),
    dataClass: text(input, 'dataClass', 180),
    criticality: choice(input, 'criticality', levels),
    exposure: choice(input, 'exposure', exposures),
    retention: choice(input, 'retention', retentions),
    cryptoAgility: choice(input, 'cryptoAgility', levels),
    evidenceNote: text(input, 'evidenceNote', 2_000),
  };
}

export function parseRecommendation(value: unknown): CreateRecommendation {
  const input = record(value);
  return {
    itemId: uuid(input, 'itemId'),
    action: text(input, 'action', 1_200),
    priority: choice(input, 'priority', levels),
    dependency: text(input, 'dependency', 1_000),
    limitation: text(input, 'limitation', 1_200),
  };
}

export function parseRoadmapPhase(value: unknown): CreateRoadmapPhase {
  const input = record(value);
  const phaseNumber = Number(input.phaseNumber);
  if (!Number.isInteger(phaseNumber) || phaseNumber < 1 || phaseNumber > 5) {
    throw new BadRequestException('phaseNumber must be an integer from 1 to 5');
  }
  return {
    phaseNumber,
    title: text(input, 'title', 160),
    objective: text(input, 'objective', 1_200),
    exitCriteria: text(input, 'exitCriteria', 1_200),
    operationalRisks: text(input, 'operationalRisks', 1_200),
  };
}

export function parseReviewNote(value: unknown): string {
  return text(record(value), 'note', 2_000);
}
