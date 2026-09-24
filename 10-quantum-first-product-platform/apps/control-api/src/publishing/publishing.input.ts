import { BadRequestException } from '@nestjs/common';
import type {
  CreateClaim,
  CreateEvidence,
  CreateScenario,
} from './publishing.model.js';

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

export function parseEvidence(value: unknown): CreateEvidence {
  const input = record(value);
  const sourceUri = text(input, 'sourceUri', 2_000);
  try {
    const url = new URL(sourceUri);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new BadRequestException('sourceUri must be an absolute HTTP(S) URL');
  }
  const sourceKind = input.sourceKind;
  if (!['primary', 'standard', 'internal'].includes(String(sourceKind))) {
    throw new BadRequestException(
      'sourceKind must be one of: primary, standard, internal',
    );
  }
  return {
    title: text(input, 'title', 240),
    sourceUri,
    sourceKind: sourceKind as CreateEvidence['sourceKind'],
    notes: text(input, 'notes', 2_000),
  };
}

export function parseClaim(value: unknown): CreateClaim {
  const input = record(value);
  const evidenceId = text(input, 'evidenceId', 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      evidenceId,
    )
  ) {
    throw new BadRequestException('evidenceId must be a UUID');
  }
  return { evidenceId, statement: text(input, 'statement', 2_000) };
}

export function parseReview(value: unknown): {
  decision: 'approved' | 'rejected';
  note: string;
} {
  const input = record(value);
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    throw new BadRequestException('decision must be approved or rejected');
  }
  return { decision: input.decision, note: text(input, 'note', 2_000) };
}

export function parseScenario(value: unknown): CreateScenario {
  const input = record(value);
  const key = text(input, 'key', 100);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) {
    throw new BadRequestException(
      'key must be a lowercase kebab-case identifier',
    );
  }
  return {
    key,
    packaging: text(input, 'packaging', 1_000),
    pricing: text(input, 'pricing', 1_000),
    licensing: text(input, 'licensing', 1_000),
    assumptions: text(input, 'assumptions', 2_000),
  };
}
