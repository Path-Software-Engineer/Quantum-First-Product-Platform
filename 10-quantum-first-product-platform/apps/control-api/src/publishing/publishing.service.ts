import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CatalogScope } from '../catalog/catalog.service.js';
import type {
  CreateClaim,
  CreateEvidence,
  CreateScenario,
} from './publishing.model.js';
import { PublishingRepository } from './publishing.repository.js';

function isIntegrityConflict(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    ['23503', '23505'].includes(String(error.code)),
  );
}

@Injectable()
export class PublishingService {
  constructor(private readonly repository: PublishingRepository) {}

  async createEvidence(
    scope: CatalogScope,
    versionId: string,
    input: CreateEvidence,
  ) {
    const result = await this.repository.createEvidence(
      scope,
      versionId,
      input,
    );
    if (!result)
      throw new ConflictException(
        'Product version was not found or is not editable',
      );
    return result;
  }

  async createClaim(
    scope: CatalogScope,
    versionId: string,
    input: CreateClaim,
  ) {
    try {
      const result = await this.repository.createClaim(scope, versionId, input);
      if (!result) {
        throw new ConflictException(
          'Product version was not found or is not editable',
        );
      }
      return result;
    } catch (error) {
      if (isIntegrityConflict(error)) {
        throw new ConflictException(
          'Evidence must belong to the same editable product version',
        );
      }
      throw error;
    }
  }

  async listClaims(scope: CatalogScope, versionId: string) {
    const result = await this.repository.listClaims(scope, versionId);
    if (!result) throw new NotFoundException('Product version not found');
    return result;
  }

  async createScenario(
    scope: CatalogScope,
    versionId: string,
    input: CreateScenario,
  ) {
    try {
      const result = await this.repository.createScenario(
        scope,
        versionId,
        input,
      );
      if (!result) {
        throw new ConflictException(
          'Product version was not found or is not editable',
        );
      }
      return result;
    } catch (error) {
      if (isIntegrityConflict(error)) {
        throw new ConflictException(
          'Scenario key already exists in this version',
        );
      }
      throw error;
    }
  }

  async submitVersion(scope: CatalogScope, versionId: string) {
    if (!(await this.repository.submitVersion(scope, versionId))) {
      throw new ConflictException(
        'Draft version with at least one claim is required',
      );
    }
    return { versionId, status: 'in_review' as const };
  }

  async reviewClaim(
    scope: CatalogScope,
    claimId: string,
    decision: 'approved' | 'rejected',
    note: string,
  ) {
    const result = await this.repository.reviewClaim(
      scope,
      claimId,
      decision,
      note,
    );
    if (!result) {
      throw new ConflictException(
        'Claim must be in review and reviewed by someone other than its owner',
      );
    }
    return result;
  }

  async approveVersion(scope: CatalogScope, versionId: string) {
    if (!(await this.repository.approveVersion(scope, versionId))) {
      throw new ConflictException(
        'Approval requires reviewed claims and a hypothetical commercial scenario',
      );
    }
    return { versionId, status: 'approved' as const };
  }

  async publishVersion(scope: CatalogScope, versionId: string) {
    if (!(await this.repository.publishVersion(scope, versionId))) {
      throw new ConflictException(
        'Only an approved product version can be published',
      );
    }
    return { versionId, status: 'published' as const };
  }

  async buildOnePager(scope: CatalogScope, versionId: string) {
    const result = await this.repository.buildOnePager(scope, versionId);
    if (!result)
      throw new ConflictException(
        'Only a published product version can be built',
      );
    return result;
  }

  async getBuild(scope: CatalogScope, buildId: string) {
    const result = await this.repository.getBuild(scope, buildId);
    if (!result) throw new NotFoundException('One-pager build not found');
    return result;
  }

  async getPublicBuild(buildId: string) {
    const result = await this.repository.getPublicBuild(buildId);
    if (!result) throw new NotFoundException('Published one-pager not found');
    return result;
  }

  listAuditEvents(scope: CatalogScope) {
    return this.repository.listAuditEvents(scope);
  }
}
