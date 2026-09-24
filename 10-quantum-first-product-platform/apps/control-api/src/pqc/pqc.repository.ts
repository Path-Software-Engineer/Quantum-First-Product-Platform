import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { CatalogScope } from '../catalog/catalog.service.js';
import { DatabaseService } from '../database/database.service.js';
import type {
  Assessment,
  CreateAssessment,
  CreateInventoryItem,
  CreateRecommendation,
  CreateRoadmapPhase,
  InventoryItem,
  Recommendation,
  ReportBuild,
  ReportSnapshot,
  RoadmapPhase,
} from './pqc.model.js';

@Injectable()
export class PqcRepository {
  constructor(private readonly database: DatabaseService) {}

  async createAssessment(scope: CatalogScope, input: CreateAssessment) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const assessmentId = randomUUID();
      const result = await client.query(
        `INSERT INTO pqc_assessments (
           organization_id, workspace_id, version_id, assessment_id, title,
           industry, critical_systems, sensitive_data, maturity, primary_concern,
           assessment_scope, assumptions, evidence_basis, created_by
         ) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
           WHERE EXISTS (SELECT 1 FROM product_versions WHERE organization_id=$1
             AND workspace_id=$2 AND version_id=$3)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          input.versionId,
          assessmentId,
          input.title,
          input.industry,
          input.criticalSystems,
          input.sensitiveData,
          input.maturity,
          input.primaryConcern,
          input.scope,
          input.assumptions,
          input.evidenceBasis,
          scope.subjectId,
        ],
      );
      if (!result.rows[0]) return null;
      await this.audit(
        client,
        scope,
        'pqc_assessment.created',
        'pqc_assessment',
        assessmentId,
      );
      return this.assessment(result.rows[0]);
    });
  }

  async addInventoryItem(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateInventoryItem,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftAssessment(client, scope, assessmentId)))
        return null;
      const itemId = randomUUID();
      const scored = score(input);
      const result = await client.query(
        `INSERT INTO crypto_inventory_items (
           organization_id, workspace_id, assessment_id, item_id, system_name,
           algorithm, protocol, data_class, criticality, exposure, retention,
           crypto_agility, evidence_note, risk_score, risk_tier
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          assessmentId,
          itemId,
          input.systemName,
          input.algorithm,
          input.protocol,
          input.dataClass,
          input.criticality,
          input.exposure,
          input.retention,
          input.cryptoAgility,
          input.evidenceNote,
          scored.riskScore,
          scored.riskTier,
        ],
      );
      await this.audit(
        client,
        scope,
        'pqc_inventory.created',
        'crypto_inventory_item',
        itemId,
      );
      return this.inventory(result.rows[0]);
    });
  }

  async addRecommendation(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateRecommendation,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftAssessment(client, scope, assessmentId)))
        return null;
      const recommendationId = randomUUID();
      const result = await client.query(
        `INSERT INTO pqc_recommendations (
           organization_id, workspace_id, assessment_id, recommendation_id,
           item_id, action, priority, dependency, limitation
         ) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9
           WHERE EXISTS (SELECT 1 FROM crypto_inventory_items WHERE
             organization_id=$1 AND workspace_id=$2 AND assessment_id=$3 AND item_id=$5)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          assessmentId,
          recommendationId,
          input.itemId,
          input.action,
          input.priority,
          input.dependency,
          input.limitation,
        ],
      );
      if (!result.rows[0]) return null;
      await this.audit(
        client,
        scope,
        'pqc_recommendation.created',
        'pqc_recommendation',
        recommendationId,
      );
      return this.recommendation(result.rows[0]);
    });
  }

  async addRoadmapPhase(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateRoadmapPhase,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.draftAssessment(client, scope, assessmentId)))
        return null;
      const phaseId = randomUUID();
      const result = await client.query(
        `INSERT INTO pqc_roadmap_phases (
           organization_id, workspace_id, assessment_id, phase_id, phase_number,
           title, objective, exit_criteria, operational_risks
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          assessmentId,
          phaseId,
          input.phaseNumber,
          input.title,
          input.objective,
          input.exitCriteria,
          input.operationalRisks,
        ],
      );
      await this.audit(
        client,
        scope,
        'pqc_roadmap.created',
        'pqc_roadmap_phase',
        phaseId,
      );
      return this.roadmap(result.rows[0]);
    });
  }

  async getAssessment(scope: CatalogScope, assessmentId: string) {
    return this.database.withTenant(scope.organizationId, (client) =>
      this.snapshot(client, scope, assessmentId),
    );
  }

  async reviewAssessment(
    scope: CatalogScope,
    assessmentId: string,
    note: string,
  ) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `UPDATE pqc_assessments SET status='reviewed', reviewed_by=$4,
           review_note=$5, reviewed_at=now()
         WHERE organization_id=$1 AND workspace_id=$2 AND assessment_id=$3
           AND status='draft' AND created_by <> $4
           AND EXISTS (SELECT 1 FROM crypto_inventory_items i WHERE
             i.organization_id=$1 AND i.workspace_id=$2 AND i.assessment_id=$3)
           AND EXISTS (SELECT 1 FROM pqc_recommendations r WHERE
             r.organization_id=$1 AND r.workspace_id=$2 AND r.assessment_id=$3)
           AND 5 = (SELECT count(DISTINCT phase_number) FROM pqc_roadmap_phases p
             WHERE p.organization_id=$1 AND p.workspace_id=$2 AND p.assessment_id=$3)
         RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          assessmentId,
          scope.subjectId,
          note,
        ],
      );
      if (!result.rows[0]) return null;
      await this.audit(
        client,
        scope,
        'pqc_assessment.reviewed',
        'pqc_assessment',
        assessmentId,
      );
      return this.assessment(result.rows[0]);
    });
  }

  async buildReport(scope: CatalogScope, assessmentId: string) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const data = await this.snapshot(client, scope, assessmentId);
      if (!data || data.assessment.status !== 'reviewed') return null;
      const sourceSnapshot = reportSnapshot(data);
      const sourceSha256 = createHash('sha256')
        .update(JSON.stringify(sourceSnapshot))
        .digest('hex');
      const buildId = randomUUID();
      const result = await client.query(
        `INSERT INTO pqc_report_builds (
           organization_id, workspace_id, assessment_id, build_id,
           source_snapshot, source_sha256, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          scope.organizationId,
          scope.workspaceId,
          assessmentId,
          buildId,
          sourceSnapshot,
          sourceSha256,
          scope.subjectId,
        ],
      );
      await this.audit(
        client,
        scope,
        'pqc_report.built',
        'pqc_report_build',
        buildId,
      );
      return this.build(result.rows[0]);
    });
  }

  async publishReport(scope: CatalogScope, buildId: string) {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query(
        `INSERT INTO public_pqc_reports (build_id, source_snapshot, source_sha256)
         SELECT build_id, source_snapshot, source_sha256 FROM pqc_report_builds
         WHERE organization_id=$1 AND workspace_id=$2 AND build_id=$3
         ON CONFLICT (build_id) DO NOTHING
         RETURNING build_id, source_snapshot, source_sha256, published_at`,
        [scope.organizationId, scope.workspaceId, buildId],
      );
      if (!result.rows[0]) return null;
      await this.audit(
        client,
        scope,
        'pqc_report.published',
        'pqc_report_build',
        buildId,
      );
      return this.publicBuild(result.rows[0]);
    });
  }

  async getPublicReport(buildId: string) {
    const result = await this.database.query(
      `SELECT build_id, source_snapshot, source_sha256, published_at
       FROM public_pqc_reports WHERE build_id=$1`,
      [buildId],
    );
    return result.rows[0] ? this.publicBuild(result.rows[0]) : null;
  }

  private async snapshot(
    client: PoolClient,
    scope: CatalogScope,
    assessmentId: string,
  ) {
    const assessment = await client.query(
      `SELECT * FROM pqc_assessments WHERE organization_id=$1
       AND workspace_id=$2 AND assessment_id=$3`,
      [scope.organizationId, scope.workspaceId, assessmentId],
    );
    if (!assessment.rows[0]) return null;
    const inventory = await client.query(
      `SELECT * FROM crypto_inventory_items WHERE organization_id=$1
       AND workspace_id=$2 AND assessment_id=$3 ORDER BY risk_score DESC, item_id`,
      [scope.organizationId, scope.workspaceId, assessmentId],
    );
    const recommendations = await client.query(
      `SELECT * FROM pqc_recommendations WHERE organization_id=$1
       AND workspace_id=$2 AND assessment_id=$3 ORDER BY priority DESC, recommendation_id`,
      [scope.organizationId, scope.workspaceId, assessmentId],
    );
    const roadmap = await client.query(
      `SELECT * FROM pqc_roadmap_phases WHERE organization_id=$1
       AND workspace_id=$2 AND assessment_id=$3 ORDER BY phase_number`,
      [scope.organizationId, scope.workspaceId, assessmentId],
    );
    return {
      assessment: this.assessment(assessment.rows[0]),
      inventory: inventory.rows.map((row) => this.inventory(row)),
      recommendations: recommendations.rows.map((row) =>
        this.recommendation(row),
      ),
      roadmap: roadmap.rows.map((row) => this.roadmap(row)),
    };
  }

  private async draftAssessment(
    client: PoolClient,
    scope: CatalogScope,
    assessmentId: string,
  ) {
    const result = await client.query(
      `SELECT 1 FROM pqc_assessments WHERE organization_id=$1
       AND workspace_id=$2 AND assessment_id=$3 AND status='draft'`,
      [scope.organizationId, scope.workspaceId, assessmentId],
    );
    return Boolean(result.rowCount);
  }

  private assessment(row: any): Assessment {
    return {
      assessmentId: row.assessment_id,
      versionId: row.version_id,
      title: row.title,
      industry: row.industry,
      criticalSystems: row.critical_systems,
      sensitiveData: row.sensitive_data,
      maturity: row.maturity,
      primaryConcern: row.primary_concern,
      scope: row.assessment_scope,
      assumptions: row.assumptions,
      evidenceBasis: row.evidence_basis,
      status: row.status,
      createdBy: row.created_by,
      reviewedBy: row.reviewed_by,
      reviewNote: row.review_note,
    };
  }

  private inventory(row: any): InventoryItem {
    const values = {
      criticality: factor(row.criticality),
      exposure: factor(row.exposure),
      retention: factor(row.retention),
      cryptoAgility: agilityFactor(row.crypto_agility),
    };
    return {
      itemId: row.item_id,
      assessmentId: row.assessment_id,
      systemName: row.system_name,
      algorithm: row.algorithm,
      protocol: row.protocol,
      dataClass: row.data_class,
      criticality: row.criticality,
      exposure: row.exposure,
      retention: row.retention,
      cryptoAgility: row.crypto_agility,
      evidenceNote: row.evidence_note,
      riskScore: Number(row.risk_score),
      riskTier: row.risk_tier,
      scoreFactors: values,
    };
  }

  private recommendation(row: any): Recommendation {
    return {
      recommendationId: row.recommendation_id,
      assessmentId: row.assessment_id,
      itemId: row.item_id,
      action: row.action,
      priority: row.priority,
      dependency: row.dependency,
      limitation: row.limitation,
    };
  }

  private roadmap(row: any): RoadmapPhase {
    return {
      phaseId: row.phase_id,
      assessmentId: row.assessment_id,
      phaseNumber: Number(row.phase_number),
      title: row.title,
      objective: row.objective,
      exitCriteria: row.exit_criteria,
      operationalRisks: row.operational_risks,
    };
  }

  private build(row: any): ReportBuild {
    return {
      buildId: row.build_id,
      assessmentId: row.assessment_id,
      sourceSnapshot: row.source_snapshot,
      sourceSha256: row.source_sha256,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private publicBuild(row: any): ReportBuild {
    return {
      buildId: row.build_id,
      assessmentId: row.source_snapshot.assessment.assessmentId,
      sourceSnapshot: row.source_snapshot,
      sourceSha256: row.source_sha256,
      createdAt: new Date(row.published_at).toISOString(),
      publishedAt: new Date(row.published_at).toISOString(),
    };
  }

  private audit(
    client: PoolClient,
    scope: CatalogScope,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    return client.query(
      `INSERT INTO audit_events (organization_id, workspace_id, event_id,
       actor_subject_id, action, entity_type, entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        scope.organizationId,
        scope.workspaceId,
        randomUUID(),
        scope.subjectId,
        action,
        entityType,
        entityId,
      ],
    );
  }
}

function factor(value: string) {
  return value === 'low' || value === 'internal' || value === 'short'
    ? 1
    : value === 'medium' || value === 'partner'
      ? 2
      : 3;
}

function agilityFactor(value: string) {
  return value === 'high' ? 1 : value === 'medium' ? 2 : 3;
}

export function score(input: CreateInventoryItem) {
  const scoreFactors = {
    criticality: factor(input.criticality),
    exposure: factor(input.exposure),
    retention: factor(input.retention),
    cryptoAgility: agilityFactor(input.cryptoAgility),
  };
  const riskScore = Object.values(scoreFactors).reduce(
    (sum, value) => sum + value,
    0,
  );
  const riskTier = riskScore >= 10 ? 'high' : riskScore >= 7 ? 'medium' : 'low';
  return { riskScore, riskTier, scoreFactors } as const;
}

function reportSnapshot(data: {
  assessment: Assessment;
  inventory: InventoryItem[];
  recommendations: Recommendation[];
  roadmap: RoadmapPhase[];
}): ReportSnapshot {
  const assessment = {
    assessmentId: data.assessment.assessmentId,
    versionId: data.assessment.versionId,
    title: data.assessment.title,
    industry: data.assessment.industry,
    criticalSystems: data.assessment.criticalSystems,
    sensitiveData: data.assessment.sensitiveData,
    maturity: data.assessment.maturity,
    primaryConcern: data.assessment.primaryConcern,
    scope: data.assessment.scope,
    assumptions: data.assessment.assumptions,
    evidenceBasis: data.assessment.evidenceBasis,
    status: data.assessment.status,
    reviewNote: data.assessment.reviewNote,
  };
  const highPriorityItems = data.inventory.filter(
    (item) => item.riskTier === 'high',
  ).length;
  const highestTier = highPriorityItems
    ? 'high'
    : data.inventory.some((item) => item.riskTier === 'medium')
      ? 'medium'
      : 'low';
  return {
    schemaVersion: 'p10.pqc-report.v1',
    disclaimer:
      'Readiness planning from declared evidence; not an audit, certification, exploitability finding or migration guarantee.',
    scoreRubric:
      'Four factors from 1 to 3 produce 4–12: low 4–6, medium 7–9, high 10–12.',
    assessment,
    executiveSummary: {
      inventoryItems: data.inventory.length,
      highPriorityItems,
      highestTier,
      nextAction: highPriorityItems
        ? 'Validate high-priority inventory evidence before selecting migration controls.'
        : 'Continue evidence collection and validate declared cryptographic dependencies.',
    },
    inventory: data.inventory,
    recommendations: data.recommendations,
    roadmap: data.roadmap,
  };
}
