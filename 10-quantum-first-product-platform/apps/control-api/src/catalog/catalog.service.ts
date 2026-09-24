import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCapability,
  CreateProduct,
  CreateUseCase,
  CreateVersion,
} from './catalog.model.js';
import { CatalogRepository } from './catalog.repository.js';

export type CatalogScope = Readonly<{
  organizationId: string;
  workspaceId: string;
  subjectId: string;
}>;

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505',
  );
}

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async createProduct(scope: CatalogScope, input: CreateProduct) {
    try {
      return await this.repository.createProduct(scope, input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Product slug already exists in this workspace',
        );
      }
      throw error;
    }
  }

  listProducts(scope: CatalogScope) {
    return this.repository.listProducts(scope);
  }

  async getProduct(scope: CatalogScope, productId: string) {
    const result = await this.repository.getProduct(scope, productId);
    if (!result) throw new NotFoundException('Product not found');
    return result;
  }

  async createVersion(
    scope: CatalogScope,
    productId: string,
    input: CreateVersion,
  ) {
    try {
      const result = await this.repository.createVersion(
        scope,
        productId,
        input,
      );
      if (!result) throw new NotFoundException('Product not found');
      return result;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Could not allocate the next product version',
        );
      }
      throw error;
    }
  }

  async addCapability(
    scope: CatalogScope,
    versionId: string,
    input: CreateCapability,
  ) {
    try {
      const result = await this.repository.addCapability(
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
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Capability key already exists in this version',
        );
      }
      throw error;
    }
  }

  async listCapabilities(scope: CatalogScope, versionId: string) {
    const result = await this.repository.listCapabilities(scope, versionId);
    if (!result) throw new NotFoundException('Product version not found');
    return result;
  }

  async addUseCase(
    scope: CatalogScope,
    versionId: string,
    input: CreateUseCase,
  ) {
    try {
      const result = await this.repository.addUseCase(scope, versionId, input);
      if (!result) {
        throw new ConflictException(
          'Product version was not found or is not editable',
        );
      }
      return result;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Use-case key already exists in this version',
        );
      }
      throw error;
    }
  }

  async listUseCases(scope: CatalogScope, versionId: string) {
    const result = await this.repository.listUseCases(scope, versionId);
    if (!result) throw new NotFoundException('Product version not found');
    return result;
  }
}
