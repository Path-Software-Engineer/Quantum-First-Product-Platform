import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CatalogScope } from '../catalog/catalog.service.js';
import type {
  CreateAssessment,
  CreateInventoryItem,
  CreateRecommendation,
  CreateRoadmapPhase,
} from './pqc.model.js';
import { PqcRepository } from './pqc.repository.js';

@Injectable()
export class PqcService {
  constructor(private readonly repository: PqcRepository) {}

  async createAssessment(scope: CatalogScope, input: CreateAssessment) {
    const result = await this.repository.createAssessment(scope, input);
    if (!result) throw new NotFoundException('Product version not found');
    return result;
  }

  async addInventoryItem(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateInventoryItem,
  ) {
    const result = await this.repository.addInventoryItem(
      scope,
      assessmentId,
      input,
    );
    if (!result)
      throw new ConflictException(
        'Assessment was not found or is no longer editable',
      );
    return result;
  }

  async addRecommendation(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateRecommendation,
  ) {
    const result = await this.repository.addRecommendation(
      scope,
      assessmentId,
      input,
    );
    if (!result)
      throw new ConflictException(
        'Assessment or inventory item was not found, or assessment is no longer editable',
      );
    return result;
  }

  async addRoadmapPhase(
    scope: CatalogScope,
    assessmentId: string,
    input: CreateRoadmapPhase,
  ) {
    try {
      const result = await this.repository.addRoadmapPhase(
        scope,
        assessmentId,
        input,
      );
      if (!result)
        throw new ConflictException(
          'Assessment was not found or is no longer editable',
        );
      return result;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Roadmap phase number already exists');
      }
      throw error;
    }
  }

  async getAssessment(scope: CatalogScope, assessmentId: string) {
    const result = await this.repository.getAssessment(scope, assessmentId);
    if (!result) throw new NotFoundException('PQC assessment not found');
    return result;
  }

  async reviewAssessment(
    scope: CatalogScope,
    assessmentId: string,
    note: string,
  ) {
    const result = await this.repository.reviewAssessment(
      scope,
      assessmentId,
      note,
    );
    if (!result) {
      throw new ConflictException(
        'Review requires a distinct reviewer, inventory, recommendations and all five roadmap phases',
      );
    }
    return result;
  }

  async buildReport(scope: CatalogScope, assessmentId: string) {
    const result = await this.repository.buildReport(scope, assessmentId);
    if (!result)
      throw new ConflictException(
        'Only a reviewed assessment can produce a report',
      );
    return result;
  }

  async publishReport(scope: CatalogScope, buildId: string) {
    const result = await this.repository.publishReport(scope, buildId);
    if (!result)
      throw new ConflictException(
        'Report build was not found or is already published',
      );
    return result;
  }

  async getPublicReport(buildId: string) {
    const result = await this.repository.getPublicReport(buildId);
    if (!result) throw new NotFoundException('Published PQC report not found');
    return result;
  }
}
