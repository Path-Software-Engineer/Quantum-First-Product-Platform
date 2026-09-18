import { BadRequestException } from '@nestjs/common';
import {
  capabilityMaturities,
  evidenceStatuses,
  type CreateCapability,
  type CreateProduct,
  type CreateUseCase,
  type CreateVersion,
} from './catalog.model.js';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object');
  }
  return value as Record<string, unknown>;
}

function text(
  input: Record<string, unknown>,
  key: string,
  max: number,
): string {
  const value = input[key];
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > max
  ) {
    throw new BadRequestException(
      `${key} must contain between 1 and ${max} characters`,
    );
  }
  return value.trim();
}

function slug(input: Record<string, unknown>, key: string): string {
  const value = text(input, key, 100);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    throw new BadRequestException(
      `${key} must be a lowercase kebab-case identifier`,
    );
  }
  return value;
}

function choice<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  const value = input[key];
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new BadRequestException(
      `${key} must be one of: ${values.join(', ')}`,
    );
  }
  return value as T;
}

export function parseProduct(value: unknown): CreateProduct {
  const input = record(value);
  return {
    slug: slug(input, 'slug'),
    displayName: text(input, 'displayName', 160),
    summary: text(input, 'summary', 2_000),
  };
}

export function parseVersion(value: unknown): CreateVersion {
  return { changeSummary: text(record(value), 'changeSummary', 1_000) };
}

export function parseCapability(value: unknown): CreateCapability {
  const input = record(value);
  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isSafeInteger(sortOrder) || Number(sortOrder) < 0) {
    throw new BadRequestException('sortOrder must be a non-negative integer');
  }
  return {
    key: slug(input, 'key'),
    title: text(input, 'title', 160),
    description: text(input, 'description', 3_000),
    maturity: choice(input, 'maturity', capabilityMaturities),
    limitations: text(input, 'limitations', 2_000),
    sortOrder: Number(sortOrder),
  };
}

export function parseUseCase(value: unknown): CreateUseCase {
  const input = record(value);
  return {
    key: slug(input, 'key'),
    actor: text(input, 'actor', 160),
    problem: text(input, 'problem', 2_000),
    workflow: text(input, 'workflow', 3_000),
    expectedOutcome: text(input, 'expectedOutcome', 2_000),
    evidenceStatus: choice(input, 'evidenceStatus', evidenceStatuses),
  };
}
