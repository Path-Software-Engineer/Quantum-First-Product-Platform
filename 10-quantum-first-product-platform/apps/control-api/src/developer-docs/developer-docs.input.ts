import { BadRequestException } from '@nestjs/common';
import {
  exampleLanguages,
  httpMethods,
  serviceStatuses,
  type CreateApiDocument,
  type CreateApiEndpoint,
  type CreateApiError,
  type CreateApiExample,
  type JsonObject,
  type Quickstart,
} from './developer-docs.model.js';

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
  values: T,
): T[number] {
  const value = String(input[key]);
  if (!values.includes(value))
    throw new BadRequestException(
      `${key} must be one of: ${values.join(', ')}`,
    );
  return value as T[number];
}

function jsonObject(input: Record<string, unknown>, key: string): JsonObject {
  const value = input[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${key} must be a JSON object`);
  }
  return value as JsonObject;
}

function stringArray(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    throw new BadRequestException(`${key} must be a non-empty string array`);
  }
  return value.map((item) => String(item).trim());
}

export function parseApiDocument(
  value: unknown,
  versionId: string,
): CreateApiDocument {
  const input = record(value);
  const baseUrl = text(input, 'baseUrl', 500);
  if (!/^https?:\/\//.test(baseUrl))
    throw new BadRequestException('baseUrl must be an HTTP or HTTPS URL');
  return {
    versionId,
    apiName: text(input, 'apiName', 160),
    apiVersion: text(input, 'apiVersion', 40),
    description: text(input, 'description', 2_000),
    authModel: text(input, 'authModel', 500),
    baseUrl,
    rateLimits: text(input, 'rateLimits', 500),
    serviceStatus: choice(input, 'serviceStatus', serviceStatuses),
  };
}

export function parseEndpoint(value: unknown): CreateApiEndpoint {
  const input = record(value);
  const path = text(input, 'path', 500);
  if (!path.startsWith('/'))
    throw new BadRequestException('path must start with /');
  const parameters = input.parameters;
  if (
    !Array.isArray(parameters) ||
    parameters.some(
      (item) => !item || typeof item !== 'object' || Array.isArray(item),
    )
  ) {
    throw new BadRequestException(
      'parameters must be an array of JSON objects',
    );
  }
  return {
    method: choice(input, 'method', httpMethods),
    path,
    summary: text(input, 'summary', 240),
    description: text(input, 'description', 2_000),
    tags: stringArray(input, 'tags'),
    useCase: text(input, 'useCase', 1_200),
    parameters: parameters as JsonObject[],
    requestSchema: jsonObject(input, 'requestSchema'),
    responseSchema: jsonObject(input, 'responseSchema'),
  };
}

export function parseError(value: unknown): CreateApiError {
  const input = record(value);
  const httpStatus = Number(input.httpStatus);
  if (!Number.isInteger(httpStatus) || httpStatus < 400 || httpStatus > 599) {
    throw new BadRequestException(
      'httpStatus must be an integer from 400 to 599',
    );
  }
  if (typeof input.isCommon !== 'boolean')
    throw new BadRequestException('isCommon must be a boolean');
  return {
    errorCode: text(input, 'errorCode', 120),
    httpStatus,
    message: text(input, 'message', 500),
    cause: text(input, 'cause', 1_000),
    example: jsonObject(input, 'example'),
    suggestedSolution: text(input, 'suggestedSolution', 1_200),
    isCommon: input.isCommon,
  };
}

export function parseExample(value: unknown): CreateApiExample {
  const input = record(value);
  return {
    language: choice(input, 'language', exampleLanguages),
    title: text(input, 'title', 180),
    requestSample: text(input, 'requestSample', 8_000),
    responseSample: text(input, 'responseSample', 8_000),
    notes: text(input, 'notes', 1_200),
  };
}

export function parseQuickstart(value: unknown): Quickstart {
  const input = record(value);
  return {
    installation: text(input, 'installation', 2_000),
    firstCall: text(input, 'firstCall', 4_000),
    expectedResult: text(input, 'expectedResult', 2_000),
    nextStep: text(input, 'nextStep', 1_000),
    troubleshooting: text(input, 'troubleshooting', 2_000),
  };
}

export function parseReviewNote(value: unknown) {
  return text(record(value), 'note', 2_000);
}
