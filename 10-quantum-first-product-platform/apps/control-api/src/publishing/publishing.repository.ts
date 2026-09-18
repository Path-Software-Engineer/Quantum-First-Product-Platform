import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { CatalogScope } from '../catalog/catalog.service.js';
import { DatabaseService } from '../database/database.service.js';
import type {
  CommercialScenario,
  CreateClaim,
  CreateEvidence,
  CreateScenario,
  EvidenceReference,
  OnePagerBuild,
  OnePagerSnapshot,
  ProductClaim,
} from './publishing.model.js';

@Injectable()
export class PublishingRepository {
  constructor(private readonly database: DatabaseService) {}

  async createEvidence(
    scope: CatalogScope,
    versionId: string,
    input: CreateEvidence,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftVersion(client, scope, versionId))) return null;
      const evidenceId = randomUUID();
      const result = await client.query(
        `INSERT INTO evidence_references (
           organization_id, workspace_id, version_id, evidence_id, title,
           source_uri, source_kind, notes, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING evidence_id, version_id, title, source_uri, source_kind, notes, created_by`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          evidenceId,
          input.title,
          input.sourceUri,
          input.sourceKind,
          input.notes,
          scope.subjectId,
        ],
      );
      await this.audit(
        client,
        scope,
        'evidence.created',
        'evidence',
        evidenceId,
      );
      return this.evidence(result.rows[0]);
    });
  }

  async createClaim(
    scope: CatalogScope,
    versionId: string,
    input: CreateClaim,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftVersion(client, scope, versionId))) return null;
      const claimId = randomUUID();
      const result = await client.query(
        `INSERT INTO product_claims (
           organization_id, workspace_id, version_id, claim_id, evidence_id,
           statement, owner_subject_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING claim_id, version_id, evidence_id, statement, owner_subject_id,
           status, review_note, reviewed_by`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          claimId,
          input.evidenceId,
          input.statement,
          scope.subjectId,
        ],
      );
      await this.audit(client, scope, 'claim.created', 'claim', claimId);
      return this.claim(result.rows[0]);
    });
  }

  async listClaims(
    scope: CatalogScope,
    versionId: string,
  ): Promise<ProductClaim[] | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.versionExists(client, scope, versionId))) return null;
      const result = await client.query(
        `SELECT claim_id, version_id, evidence_id, statement, owner_subject_id,
           status, review_note, reviewed_by
         FROM product_claims
         WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3
         ORDER BY created_at, claim_id`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      return result.rows.map((row) => this.claim(row));
    });
  }

  async createScenario(
    scope: CatalogScope,
    versionId: string,
    input: CreateScenario,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftVersion(client, scope, versionId))) return null;
      const scenarioId = randomUUID();
      const result = await client.query(
        `INSERT INTO commercial_scenarios (
           organization_id, workspace_id, version_id, scenario_id, scenario_key,
           packaging, pricing, licensing, assumptions
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING scenario_id, version_id, scenario_key, packaging, pricing,
           licensing, assumptions, is_hypothetical`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          scenarioId,
          input.key,
          input.packaging,
          input.pricing,
          input.licensing,
          input.assumptions,
        ],
      );
      await this.audit(
        client,
        scope,
        'scenario.created',
        'commercial_scenario',
        scenarioId,
      );
      return this.scenario(result.rows[0]);
    });
  }

  async submitVersion(
    scope: CatalogScope,
    versionId: string,
  ): Promise<boolean> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE product_versions SET status='in_review'
         WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3 AND status='draft'
           AND EXISTS (
             SELECT 1 FROM product_claims c WHERE c.organization_id=$1
               AND c.workspace_id=$2 AND c.version_id=$3
           )
         RETURNING version_id`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      if (!result.rowCount) return false;
      await client.query(
        `UPDATE product_claims SET status='in_review'
         WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3 AND status='draft'`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      await this.audit(
        client,
        scope,
        'version.submitted',
        'product_version',
        versionId,
      );
      return true;
    });
  }

  async reviewClaim(
    scope: CatalogScope,
    claimId: string,
    decision: 'approved' | 'rejected',
    note: string,
  ): Promise<ProductClaim | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE product_claims SET status=$4, review_note=$5, reviewed_by=$6, reviewed_at=now()
         WHERE organization_id=$1 AND workspace_id=$2 AND claim_id=$3
           AND status='in_review' AND owner_subject_id <> $6
         RETURNING claim_id, version_id, evidence_id, statement, owner_subject_id,
           status, review_note, reviewed_by`,
        [
          scope.organizationId,
          scope.workspaceId,
          claimId,
          decision,
          note,
          scope.subjectId,
        ],
      );
      if (!result.rows[0]) return null;
      await this.audit(client, scope, `claim.${decision}`, 'claim', claimId);
      return this.claim(result.rows[0]);
    });
  }

  async approveVersion(
    scope: CatalogScope,
    versionId: string,
  ): Promise<boolean> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE product_versions SET status='approved'
         WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3 AND status='in_review'
           AND EXISTS (SELECT 1 FROM product_claims c WHERE c.organization_id=$1
             AND c.workspace_id=$2 AND c.version_id=$3 AND c.status='approved')
           AND NOT EXISTS (SELECT 1 FROM product_claims c WHERE c.organization_id=$1
             AND c.workspace_id=$2 AND c.version_id=$3 AND c.status <> 'approved')
           AND EXISTS (SELECT 1 FROM commercial_scenarios s WHERE s.organization_id=$1
             AND s.workspace_id=$2 AND s.version_id=$3 AND s.is_hypothetical)
         RETURNING version_id`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      if (!result.rowCount) return false;
      await this.audit(
        client,
        scope,
        'version.approved',
        'product_version',
        versionId,
      );
      return true;
    });
  }

  async publishVersion(
    scope: CatalogScope,
    versionId: string,
  ): Promise<boolean> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE product_versions SET status='published'
         WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3 AND status='approved'
         RETURNING version_id`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      if (!result.rowCount) return false;
      await this.audit(
        client,
        scope,
        'version.published',
        'product_version',
        versionId,
      );
      return true;
    });
  }

  async buildOnePager(
    scope: CatalogScope,
    versionId: string,
  ): Promise<OnePagerBuild | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const version = await client.query(
        `SELECT v.version_id, v.version_number, v.status, v.change_summary,
           p.product_id, p.slug, p.display_name, p.summary
         FROM product_versions v JOIN products p USING (organization_id, workspace_id, product_id)
         WHERE v.organization_id=$1 AND v.workspace_id=$2 AND v.version_id=$3
           AND v.status='published'`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      const row = version.rows[0];
      if (!row) return null;
      const [capabilities, useCases, claims, scenarios] = await Promise.all([
        client.query(
          `SELECT capability_key AS key, title, description, maturity, limitations, sort_order
           FROM capabilities WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3
           ORDER BY sort_order, capability_key`,
          [scope.organizationId, scope.workspaceId, versionId],
        ),
        client.query(
          `SELECT use_case_key AS key, actor, problem, workflow, expected_outcome, evidence_status
           FROM use_cases WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3
           ORDER BY use_case_key`,
          [scope.organizationId, scope.workspaceId, versionId],
        ),
        client.query(
          `SELECT c.claim_id, c.statement, c.owner_subject_id, c.status,
             e.title AS evidence_title, e.source_uri, e.source_kind, e.notes
           FROM product_claims c JOIN evidence_references e USING (
             organization_id, workspace_id, version_id, evidence_id
           ) WHERE c.organization_id=$1 AND c.workspace_id=$2 AND c.version_id=$3
             AND c.status='approved' ORDER BY c.created_at, c.claim_id`,
          [scope.organizationId, scope.workspaceId, versionId],
        ),
        client.query(
          `SELECT scenario_key AS key, packaging, pricing, licensing, assumptions,
             is_hypothetical FROM commercial_scenarios
           WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3
           ORDER BY scenario_key`,
          [scope.organizationId, scope.workspaceId, versionId],
        ),
      ]);
      const snapshot: OnePagerSnapshot = {
        schemaVersion: 'p10.one-pager.v1',
        product: {
          productId: row.product_id,
          slug: row.slug,
          displayName: row.display_name,
          summary: row.summary,
        },
        version: {
          versionId: row.version_id,
          versionNumber: row.version_number,
          status: row.status,
          changeSummary: row.change_summary,
        },
        capabilities: capabilities.rows,
        useCases: useCases.rows,
        claims: claims.rows,
        commercialScenarios: scenarios.rows,
      };
      const serialized = JSON.stringify(snapshot);
      const sourceSha256 = createHash('sha256')
        .update(serialized)
        .digest('hex');
      const buildId = randomUUID();
      const result = await client.query(
        `INSERT INTO one_pager_builds (
           organization_id, workspace_id, version_id, build_id, source_snapshot,
           source_sha256, created_by
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
         RETURNING build_id, version_id, source_snapshot, source_sha256, created_by, created_at`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          buildId,
          serialized,
          sourceSha256,
          scope.subjectId,
        ],
      );
      await client.query(
        `INSERT INTO public_one_pagers (build_id, source_snapshot, source_sha256)
         VALUES ($1,$2::jsonb,$3)`,
        [buildId, serialized, sourceSha256],
      );
      await this.audit(
        client,
        scope,
        'one_pager.built',
        'one_pager_build',
        buildId,
        {
          sourceSha256,
        },
      );
      return this.build(result.rows[0]);
    });
  }

  async getBuild(
    scope: CatalogScope,
    buildId: string,
  ): Promise<OnePagerBuild | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `SELECT build_id, version_id, source_snapshot, source_sha256, created_by, created_at
         FROM one_pager_builds
         WHERE organization_id=$1 AND workspace_id=$2 AND build_id=$3`,
        [scope.organizationId, scope.workspaceId, buildId],
      );
      return result.rows[0] ? this.build(result.rows[0]) : null;
    });
  }

  async getPublicBuild(buildId: string): Promise<{
    buildId: string;
    sourceSnapshot: OnePagerSnapshot;
    sourceSha256: string;
    publishedAt: string;
  } | null> {
    const result = await this.database.query<{
      build_id: string;
      source_snapshot: OnePagerSnapshot;
      source_sha256: string;
      published_at: Date;
    }>(
      `SELECT build_id, source_snapshot, source_sha256, published_at
       FROM public_one_pagers WHERE build_id = $1`,
      [buildId],
    );
    const row = result.rows[0];
    return row
      ? {
          buildId: row.build_id,
          sourceSnapshot: row.source_snapshot,
          sourceSha256: row.source_sha256,
          publishedAt: row.published_at.toISOString(),
        }
      : null;
  }

  async listAuditEvents(scope: CatalogScope) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query<{
        event_id: string;
        actor_subject_id: string;
        action: string;
        entity_type: string;
        entity_id: string;
        details: Record<string, unknown>;
        created_at: Date;
      }>(
        `SELECT event_id, actor_subject_id, action, entity_type, entity_id,
           details, created_at FROM audit_events
         WHERE organization_id=$1 AND workspace_id=$2
         ORDER BY created_at DESC, event_id DESC LIMIT 200`,
        [scope.organizationId, scope.workspaceId],
      );
      return result.rows.map((row) => ({
        eventId: row.event_id,
        actorSubjectId: row.actor_subject_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details,
        createdAt: row.created_at.toISOString(),
      }));
    });
  }

  private evidence(row: Record<string, unknown>): EvidenceReference {
    return {
      evidenceId: String(row.evidence_id),
      versionId: String(row.version_id),
      title: String(row.title),
      sourceUri: String(row.source_uri),
      sourceKind: row.source_kind as EvidenceReference['sourceKind'],
      notes: String(row.notes),
      createdBy: String(row.created_by),
    };
  }

  private claim(row: Record<string, unknown>): ProductClaim {
    return {
      claimId: String(row.claim_id),
      versionId: String(row.version_id),
      evidenceId: String(row.evidence_id),
      statement: String(row.statement),
      ownerSubjectId: String(row.owner_subject_id),
      status: row.status as ProductClaim['status'],
      reviewNote: row.review_note === null ? null : String(row.review_note),
      reviewedBy: row.reviewed_by === null ? null : String(row.reviewed_by),
    };
  }

  private scenario(row: Record<string, unknown>): CommercialScenario {
    return {
      scenarioId: String(row.scenario_id),
      versionId: String(row.version_id),
      key: String(row.scenario_key),
      packaging: String(row.packaging),
      pricing: String(row.pricing),
      licensing: String(row.licensing),
      assumptions: String(row.assumptions),
      isHypothetical: true,
    };
  }

  private build(row: Record<string, unknown>): OnePagerBuild {
    return {
      buildId: String(row.build_id),
      versionId: String(row.version_id),
      sourceSnapshot: row.source_snapshot as OnePagerSnapshot,
      sourceSha256: String(row.source_sha256),
      createdBy: String(row.created_by),
      createdAt: (row.created_at as Date).toISOString(),
    };
  }

  private async versionExists(
    client: PoolClient,
    scope: CatalogScope,
    versionId: string,
  ) {
    const result = await client.query(
      `SELECT 1 FROM product_versions
       WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3`,
      [scope.organizationId, scope.workspaceId, versionId],
    );
    return Boolean(result.rowCount);
  }

  private async draftVersion(
    client: PoolClient,
    scope: CatalogScope,
    versionId: string,
  ) {
    const result = await client.query(
      `SELECT 1 FROM product_versions
       WHERE organization_id=$1 AND workspace_id=$2 AND version_id=$3 AND status='draft'
       FOR UPDATE`,
      [scope.organizationId, scope.workspaceId, versionId],
    );
    return Boolean(result.rowCount);
  }

  private async audit(
    client: PoolClient,
    scope: CatalogScope,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown> = {},
  ) {
    await client.query(
      `INSERT INTO audit_events (
         organization_id, workspace_id, event_id, actor_subject_id,
         action, entity_type, entity_id, details
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        scope.organizationId,
        scope.workspaceId,
        randomUUID(),
        scope.subjectId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
      ],
    );
  }
}
