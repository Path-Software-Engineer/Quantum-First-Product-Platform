import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CatalogScope } from '../catalog/catalog.service.js';
import type {
  CreateApiDocument,
  CreateApiEndpoint,
  CreateApiError,
  CreateApiExample,
  Quickstart,
} from './developer-docs.model.js';
import { DeveloperDocsRepository } from './developer-docs.repository.js';

@Injectable()
export class DeveloperDocsService {
  constructor(private readonly repository: DeveloperDocsRepository) {}

  async create(scope: CatalogScope, input: CreateApiDocument) {
    const result = await this.repository.createDocument(scope, input);
    if (!result) throw new NotFoundException('Product version not found');
    return result;
  }

  async get(scope: CatalogScope, id: string) {
    const result = await this.repository.getDocument(scope, id);
    if (!result)
      throw new NotFoundException('Developer documentation project not found');
    return result;
  }

  async addEndpoint(scope: CatalogScope, id: string, input: CreateApiEndpoint) {
    return this.draft(this.repository.addEndpoint(scope, id, input));
  }

  async addError(scope: CatalogScope, id: string, input: CreateApiError) {
    return this.draft(this.repository.addError(scope, id, input));
  }

  async addExample(scope: CatalogScope, id: string, input: CreateApiExample) {
    return this.draft(this.repository.addExample(scope, id, input));
  }

  async setQuickstart(scope: CatalogScope, id: string, input: Quickstart) {
    return this.draft(this.repository.setQuickstart(scope, id, input));
  }

  async review(scope: CatalogScope, id: string, note: string) {
    const result = await this.repository.review(scope, id, note);
    if (!result)
      throw new ConflictException(
        'Review requires a distinct reviewer, an endpoint, an error, curl and Python examples, and a quickstart',
      );
    return result;
  }

  async build(scope: CatalogScope, id: string) {
    const result = await this.repository.build(scope, id);
    if (!result)
      throw new ConflictException(
        'Only reviewed developer documentation can produce a build',
      );
    return result;
  }

  async publish(scope: CatalogScope, id: string) {
    const result = await this.repository.publish(scope, id);
    if (!result)
      throw new ConflictException(
        'Documentation build was not found or is already published',
      );
    return result;
  }

  async publicBuild(id: string) {
    const result = await this.repository.getPublic(id);
    if (!result)
      throw new NotFoundException(
        'Published developer documentation not found',
      );
    return result;
  }

  private async draft<T>(promise: Promise<T | null>) {
    const result = await promise;
    if (!result)
      throw new ConflictException(
        'Documentation project was not found or is no longer editable',
      );
    return result;
  }
}
