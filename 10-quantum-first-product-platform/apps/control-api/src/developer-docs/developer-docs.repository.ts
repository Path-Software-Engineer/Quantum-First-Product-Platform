import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { CatalogScope } from '../catalog/catalog.service.js';
import { DatabaseService } from '../database/database.service.js';
import type {
  ApiDocument,
  ApiEndpoint,
  ApiError,
  ApiExample,
  CreateApiDocument,
  CreateApiEndpoint,
  CreateApiError,
  CreateApiExample,
  DeveloperDocsBuild,
  DeveloperDocsSnapshot,
  Quickstart,
} from './developer-docs.model.js';
import { renderMarkdown } from './markdown.js';

@Injectable()
export class DeveloperDocsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createDocument(scope: CatalogScope, input: CreateApiDocument) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const documentId = randomUUID();
      const result = await client.query(
        `INSERT INTO api_doc_projects (organization_id, workspace_id, version_id,
          document_id, api_name, api_version, description, auth_model, base_url,
          rate_limits, service_status, created_by)
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12 WHERE EXISTS (
           SELECT 1 FROM product_versions WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          input.versionId,
          documentId,
          input.apiName,
          input.apiVersion,
          input.description,
          input.authModel,
          input.baseUrl,
          input.rateLimits,
          input.serviceStatus,
          scope.subjectId,
        ],
      );
      if (!result.rows[0]) return null;
      await this.auditAndOutbox(
        client,
        scope,
        'developer_docs.created',
        documentId,
      );
      return document(result.rows[0]);
    });
  }

  addEndpoint(
    scope: CatalogScope,
    documentId: string,
    input: CreateApiEndpoint,
  ) {
    return this.addDraft(scope, documentId, async (client) => {
      const endpointId = randomUUID();
      const result = await client.query(
        `INSERT INTO api_doc_endpoints (organization_id, workspace_id, document_id,
          endpoint_id, method, path, summary, description, tags, use_case,
          parameters, request_schema, response_schema)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          endpointId,
          input.method,
          input.path,
          input.summary,
          input.description,
          JSON.stringify(input.tags),
          input.useCase,
          JSON.stringify(input.parameters),
          JSON.stringify(input.requestSchema),
          JSON.stringify(input.responseSchema),
        ],
      );
      return endpoint(result.rows[0]);
    });
  }

  addError(scope: CatalogScope, documentId: string, input: CreateApiError) {
    return this.addDraft(scope, documentId, async (client) => {
      const errorId = randomUUID();
      const result = await client.query(
        `INSERT INTO api_doc_errors (organization_id, workspace_id, document_id,
          error_id, error_code, http_status, message, cause, example,
          suggested_solution, is_common) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          errorId,
          input.errorCode,
          input.httpStatus,
          input.message,
          input.cause,
          JSON.stringify(input.example),
          input.suggestedSolution,
          input.isCommon,
        ],
      );
      return apiError(result.rows[0]);
    });
  }

  addExample(scope: CatalogScope, documentId: string, input: CreateApiExample) {
    return this.addDraft(scope, documentId, async (client) => {
      const exampleId = randomUUID();
      const result = await client.query(
        `INSERT INTO api_doc_examples (organization_id, workspace_id, document_id,
          example_id, language, title, request_sample, response_sample, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          exampleId,
          input.language,
          input.title,
          input.requestSample,
          input.responseSample,
          input.notes,
        ],
      );
      return example(result.rows[0]);
    });
  }

  setQuickstart(scope: CatalogScope, documentId: string, input: Quickstart) {
    return this.addDraft(scope, documentId, async (client) => {
      const result = await client.query(
        `INSERT INTO api_doc_quickstarts (organization_id, workspace_id, document_id,
          installation, first_call, expected_result, next_step, troubleshooting)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (organization_id, workspace_id, document_id) DO UPDATE SET
          installation=EXCLUDED.installation, first_call=EXCLUDED.first_call,
          expected_result=EXCLUDED.expected_result, next_step=EXCLUDED.next_step,
          troubleshooting=EXCLUDED.troubleshooting RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          input.installation,
          input.firstCall,
          input.expectedResult,
          input.nextStep,
          input.troubleshooting,
        ],
      );
      return quickstart(result.rows[0]);
    });
  }

  getDocument(scope: CatalogScope, documentId: string) {
    return this.database.withTenant(scope.organizationId, (client) =>
      this.snapshot(client, scope, documentId),
    );
  }

  async review(scope: CatalogScope, documentId: string, note: string) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE api_doc_projects SET status='reviewed', reviewed_by=$4, review_note=$5, reviewed_at=now()
         WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 AND status='draft'
           AND created_by <> $4
           AND EXISTS (SELECT 1 FROM api_doc_endpoints WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3)
           AND EXISTS (SELECT 1 FROM api_doc_errors WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3)
           AND EXISTS (SELECT 1 FROM api_doc_examples WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 AND language='curl')
           AND EXISTS (SELECT 1 FROM api_doc_examples WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 AND language='python')
           AND EXISTS (SELECT 1 FROM api_doc_quickstarts WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          scope.subjectId,
          note,
        ],
      );
      if (!result.rows[0]) return null;
      await this.auditAndOutbox(
        client,
        scope,
        'developer_docs.reviewed',
        documentId,
      );
      return document(result.rows[0]);
    });
  }

  async build(scope: CatalogScope, documentId: string) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const data = await this.snapshot(client, scope, documentId);
      if (!data || data.document.status !== 'reviewed') return null;
      const {
        createdBy: _createdBy,
        reviewedBy: _reviewedBy,
        ...publicDocument
      } = data.document;
      const sourceSnapshot: DeveloperDocsSnapshot = {
        schemaVersion: 'p10.developer-docs.v1',
        document: publicDocument,
        endpoints: data.endpoints,
        errors: data.errors,
        examples: data.examples,
        quickstart: data.quickstart!,
        limitations:
          'Generated from reviewed structured metadata. It does not verify implementation behavior, uptime, rate limits or production credentials.',
      };
      const markdown = renderMarkdown(sourceSnapshot);
      const sourceSha256 = createHash('sha256')
        .update(JSON.stringify(sourceSnapshot) + markdown)
        .digest('hex');
      const buildId = randomUUID();
      const result = await client.query(
        `INSERT INTO api_doc_builds (organization_id, workspace_id, document_id,
          build_id, source_snapshot, markdown, source_sha256, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          documentId,
          buildId,
          JSON.stringify(sourceSnapshot),
          markdown,
          sourceSha256,
          scope.subjectId,
        ],
      );
      await this.auditAndOutbox(client, scope, 'developer_docs.built', buildId);
      return build(result.rows[0]);
    });
  }

  async publish(scope: CatalogScope, buildId: string) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `INSERT INTO public_api_docs (build_id, source_snapshot, markdown, source_sha256)
         SELECT build_id, source_snapshot, markdown, source_sha256 FROM api_doc_builds
         WHERE organization_id=$1 AND workspace_id=$2 AND build_id=$3
         ON CONFLICT (build_id) DO NOTHING RETURNING *`,
        [scope.organizationId, scope.workspaceId, buildId],
      );
      if (!result.rows[0]) return null;
      await this.auditAndOutbox(
        client,
        scope,
        'developer_docs.published',
        buildId,
      );
      return publicBuild(result.rows[0]);
    });
  }

  async getPublic(buildId: string) {
    const result = await this.database.query(
      'SELECT * FROM public_api_docs WHERE build_id=$1',
      [buildId],
    );
    return result.rows[0] ? publicBuild(result.rows[0]) : null;
  }

  private async addDraft<T>(
    scope: CatalogScope,
    documentId: string,
    action: (client: PoolClient) => Promise<T>,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const draft = await client.query(
        `SELECT 1 FROM api_doc_projects WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 AND status='draft'`,
        [scope.organizationId, scope.workspaceId, documentId],
      );
      return draft.rowCount ? action(client) : null;
    });
  }

  private async snapshot(
    client: PoolClient,
    scope: CatalogScope,
    documentId: string,
  ) {
    const doc = await client.query(
      'SELECT * FROM api_doc_projects WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3',
      [scope.organizationId, scope.workspaceId, documentId],
    );
    if (!doc.rows[0]) return null;
    const args = [scope.organizationId, scope.workspaceId, documentId];
    const endpoints = await client.query(
        'SELECT * FROM api_doc_endpoints WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 ORDER BY path, method',
        args,
      );
    const errors = await client.query(
        'SELECT * FROM api_doc_errors WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 ORDER BY http_status, error_code',
        args,
      );
    const examples = await client.query(
        'SELECT * FROM api_doc_examples WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3 ORDER BY language, title',
        args,
      );
    const quickstarts = await client.query(
        'SELECT * FROM api_doc_quickstarts WHERE organization_id=$1 AND workspace_id=$2 AND document_id=$3',
        args,
      );
    return {
      document: document(doc.rows[0]),
      endpoints: endpoints.rows.map(endpoint),
      errors: errors.rows.map(apiError),
      examples: examples.rows.map(example),
      quickstart: quickstarts.rows[0] ? quickstart(quickstarts.rows[0]) : null,
    };
  }

  private async auditAndOutbox(
    client: PoolClient,
    scope: CatalogScope,
    eventType: string,
    aggregateId: string,
  ) {
    const eventId = randomUUID();
    await client.query(
      `INSERT INTO audit_events (organization_id, workspace_id, event_id, actor_subject_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5,'developer_docs',$6)`,
      [
        scope.organizationId,
        scope.workspaceId,
        randomUUID(),
        scope.subjectId,
        eventType,
        aggregateId,
      ],
    );
    await client.query(
      `INSERT INTO outbox_events (organization_id, workspace_id, event_id, aggregate_type, aggregate_id, event_type, payload) VALUES ($1,$2,$3,'developer_docs',$4,$5,$6)`,
      [
        scope.organizationId,
        scope.workspaceId,
        eventId,
        aggregateId,
        eventType,
        JSON.stringify({ eventId, aggregateId, eventType }),
      ],
    );
  }
}

function document(row: any): ApiDocument {
  return {
    documentId: row.document_id,
    versionId: row.version_id,
    apiName: row.api_name,
    apiVersion: row.api_version,
    description: row.description,
    authModel: row.auth_model,
    baseUrl: row.base_url,
    rateLimits: row.rate_limits,
    serviceStatus: row.service_status,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
  };
}
function endpoint(row: any): ApiEndpoint {
  return {
    endpointId: row.endpoint_id,
    documentId: row.document_id,
    method: row.method,
    path: row.path,
    summary: row.summary,
    description: row.description,
    tags: row.tags,
    useCase: row.use_case,
    parameters: row.parameters,
    requestSchema: row.request_schema,
    responseSchema: row.response_schema,
  };
}
function apiError(row: any): ApiError {
  return {
    errorId: row.error_id,
    documentId: row.document_id,
    errorCode: row.error_code,
    httpStatus: Number(row.http_status),
    message: row.message,
    cause: row.cause,
    example: row.example,
    suggestedSolution: row.suggested_solution,
    isCommon: row.is_common,
  };
}
function example(row: any): ApiExample {
  return {
    exampleId: row.example_id,
    documentId: row.document_id,
    language: row.language,
    title: row.title,
    requestSample: row.request_sample,
    responseSample: row.response_sample,
    notes: row.notes,
  };
}
function quickstart(row: any): Quickstart {
  return {
    installation: row.installation,
    firstCall: row.first_call,
    expectedResult: row.expected_result,
    nextStep: row.next_step,
    troubleshooting: row.troubleshooting,
  };
}
function build(row: any): DeveloperDocsBuild {
  return {
    buildId: row.build_id,
    documentId: row.document_id,
    sourceSnapshot: row.source_snapshot,
    markdown: row.markdown,
    sourceSha256: row.source_sha256,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
function publicBuild(row: any): DeveloperDocsBuild {
  return {
    buildId: row.build_id,
    documentId: row.source_snapshot.document.documentId,
    sourceSnapshot: row.source_snapshot,
    markdown: row.markdown,
    sourceSha256: row.source_sha256,
    createdAt: new Date(row.published_at).toISOString(),
    publishedAt: new Date(row.published_at).toISOString(),
  };
}
