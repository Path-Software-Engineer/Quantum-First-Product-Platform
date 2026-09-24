import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service.js';
import type {
  Capability,
  CreateCapability,
  CreateProduct,
  CreateUseCase,
  CreateVersion,
  Product,
  ProductVersion,
  UseCase,
} from './catalog.model.js';

type Scope = Readonly<{
  organizationId: string;
  workspaceId: string;
  subjectId: string;
}>;
type ProductRow = {
  product_id: string;
  slug: string;
  display_name: string;
  summary: string;
  created_by: string;
  created_at: Date;
};
type VersionRow = {
  product_id: string;
  version_id: string;
  version_number: number;
  status: ProductVersion['status'];
  change_summary: string;
  created_by: string;
  created_at: Date;
};

function product(row: ProductRow): Product {
  return {
    productId: row.product_id,
    slug: row.slug,
    displayName: row.display_name,
    summary: row.summary,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

function version(row: VersionRow): ProductVersion {
  return {
    productId: row.product_id,
    versionId: row.version_id,
    versionNumber: row.version_number,
    status: row.status,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: DatabaseService) {}

  async createProduct(scope: Scope, input: CreateProduct): Promise<Product> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query<ProductRow>(
        `INSERT INTO products (
           organization_id, workspace_id, product_id, slug, display_name, summary, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING product_id, slug, display_name, summary, created_by, created_at`,
        [
          scope.organizationId,
          scope.workspaceId,
          randomUUID(),
          input.slug,
          input.displayName,
          input.summary,
          scope.subjectId,
        ],
      );
      return product(result.rows[0]);
    });
  }

  async listProducts(scope: Scope): Promise<Product[]> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const result = await client.query<ProductRow>(
        `SELECT product_id, slug, display_name, summary, created_by, created_at
         FROM products WHERE organization_id = $1 AND workspace_id = $2
         ORDER BY created_at, product_id`,
        [scope.organizationId, scope.workspaceId],
      );
      return result.rows.map(product);
    });
  }

  async getProduct(
    scope: Scope,
    productId: string,
  ): Promise<{
    product: Product;
    versions: ProductVersion[];
  } | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const productResult = await client.query<ProductRow>(
        `SELECT product_id, slug, display_name, summary, created_by, created_at
         FROM products
         WHERE organization_id = $1 AND workspace_id = $2 AND product_id = $3`,
        [scope.organizationId, scope.workspaceId, productId],
      );
      if (!productResult.rows[0]) return null;
      const versions = await client.query<VersionRow>(
        `SELECT product_id, version_id, version_number, status, change_summary, created_by, created_at
         FROM product_versions
         WHERE organization_id = $1 AND workspace_id = $2 AND product_id = $3
         ORDER BY version_number`,
        [scope.organizationId, scope.workspaceId, productId],
      );
      return {
        product: product(productResult.rows[0]),
        versions: versions.rows.map(version),
      };
    });
  }

  async createVersion(
    scope: Scope,
    productId: string,
    input: CreateVersion,
  ): Promise<ProductVersion | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      const exists = await client.query(
        `SELECT product_id FROM products
         WHERE organization_id = $1 AND workspace_id = $2 AND product_id = $3 FOR UPDATE`,
        [scope.organizationId, scope.workspaceId, productId],
      );
      if (!exists.rowCount) return null;
      const result = await client.query<VersionRow>(
        `INSERT INTO product_versions (
           organization_id, workspace_id, product_id, version_id,
           version_number, change_summary, created_by
         ) SELECT $1, $2, $3, $4, COALESCE(MAX(version_number), 0) + 1, $5, $6
           FROM product_versions
           WHERE organization_id = $1 AND workspace_id = $2 AND product_id = $3
         RETURNING product_id, version_id, version_number, status,
           change_summary, created_by, created_at`,
        [
          scope.organizationId,
          scope.workspaceId,
          productId,
          randomUUID(),
          input.changeSummary,
          scope.subjectId,
        ],
      );
      return version(result.rows[0]);
    });
  }

  async addCapability(
    scope: Scope,
    versionId: string,
    input: CreateCapability,
  ): Promise<Capability | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.editableVersion(client, scope, versionId))) return null;
      const result = await client.query<{
        version_id: string;
        capability_id: string;
        capability_key: string;
        title: string;
        description: string;
        maturity: Capability['maturity'];
        limitations: string;
        sort_order: number;
      }>(
        `INSERT INTO capabilities (
           organization_id, workspace_id, version_id, capability_id, capability_key,
           title, description, maturity, limitations, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING version_id, capability_id, capability_key, title, description,
           maturity, limitations, sort_order`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          randomUUID(),
          input.key,
          input.title,
          input.description,
          input.maturity,
          input.limitations,
          input.sortOrder,
        ],
      );
      const row = result.rows[0];
      return {
        versionId: row.version_id,
        capabilityId: row.capability_id,
        key: row.capability_key,
        title: row.title,
        description: row.description,
        maturity: row.maturity,
        limitations: row.limitations,
        sortOrder: row.sort_order,
      };
    });
  }

  async listCapabilities(
    scope: Scope,
    versionId: string,
  ): Promise<Capability[] | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.versionExists(client, scope, versionId))) return null;
      const result = await client.query<{
        version_id: string;
        capability_id: string;
        capability_key: string;
        title: string;
        description: string;
        maturity: Capability['maturity'];
        limitations: string;
        sort_order: number;
      }>(
        `SELECT version_id, capability_id, capability_key, title, description,
           maturity, limitations, sort_order
         FROM capabilities
         WHERE organization_id = $1 AND workspace_id = $2 AND version_id = $3
         ORDER BY sort_order, capability_key`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      return result.rows.map((row) => ({
        versionId: row.version_id,
        capabilityId: row.capability_id,
        key: row.capability_key,
        title: row.title,
        description: row.description,
        maturity: row.maturity,
        limitations: row.limitations,
        sortOrder: row.sort_order,
      }));
    });
  }

  async addUseCase(
    scope: Scope,
    versionId: string,
    input: CreateUseCase,
  ): Promise<UseCase | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.editableVersion(client, scope, versionId))) return null;
      const result = await client.query<{
        version_id: string;
        use_case_id: string;
        use_case_key: string;
        actor: string;
        problem: string;
        workflow: string;
        expected_outcome: string;
        evidence_status: UseCase['evidenceStatus'];
      }>(
        `INSERT INTO use_cases (
           organization_id, workspace_id, version_id, use_case_id, use_case_key,
           actor, problem, workflow, expected_outcome, evidence_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING version_id, use_case_id, use_case_key, actor, problem,
           workflow, expected_outcome, evidence_status`,
        [
          scope.organizationId,
          scope.workspaceId,
          versionId,
          randomUUID(),
          input.key,
          input.actor,
          input.problem,
          input.workflow,
          input.expectedOutcome,
          input.evidenceStatus,
        ],
      );
      const row = result.rows[0];
      return {
        versionId: row.version_id,
        useCaseId: row.use_case_id,
        key: row.use_case_key,
        actor: row.actor,
        problem: row.problem,
        workflow: row.workflow,
        expectedOutcome: row.expected_outcome,
        evidenceStatus: row.evidence_status,
      };
    });
  }

  async listUseCases(
    scope: Scope,
    versionId: string,
  ): Promise<UseCase[] | null> {
    return this.database.withTenant(scope.organizationId, async (client) => {
      if (!(await this.versionExists(client, scope, versionId))) return null;
      const result = await client.query<{
        version_id: string;
        use_case_id: string;
        use_case_key: string;
        actor: string;
        problem: string;
        workflow: string;
        expected_outcome: string;
        evidence_status: UseCase['evidenceStatus'];
      }>(
        `SELECT version_id, use_case_id, use_case_key, actor, problem,
           workflow, expected_outcome, evidence_status
         FROM use_cases
         WHERE organization_id = $1 AND workspace_id = $2 AND version_id = $3
         ORDER BY use_case_key`,
        [scope.organizationId, scope.workspaceId, versionId],
      );
      return result.rows.map((row) => ({
        versionId: row.version_id,
        useCaseId: row.use_case_id,
        key: row.use_case_key,
        actor: row.actor,
        problem: row.problem,
        workflow: row.workflow,
        expectedOutcome: row.expected_outcome,
        evidenceStatus: row.evidence_status,
      }));
    });
  }

  private async versionExists(
    client: PoolClient,
    scope: Scope,
    versionId: string,
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT version_id FROM product_versions
       WHERE organization_id = $1 AND workspace_id = $2 AND version_id = $3`,
      [scope.organizationId, scope.workspaceId, versionId],
    );
    return Boolean(result.rowCount);
  }

  private async editableVersion(
    client: PoolClient,
    scope: Scope,
    versionId: string,
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT version_id FROM product_versions
       WHERE organization_id = $1 AND workspace_id = $2
         AND version_id = $3 AND status = 'draft' FOR UPDATE`,
      [scope.organizationId, scope.workspaceId, versionId],
    );
    return Boolean(result.rowCount);
  }
}
