import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Permission } from '../auth/actor.js';
import { RequirePermission } from '../auth/auth.metadata.js';
import type { AuthorizedRequest } from '../auth/workspace-permission.guard.js';
import {
  parseCapability,
  parseProduct,
  parseUseCase,
  parseVersion,
} from './catalog.input.js';
import { CatalogService, type CatalogScope } from './catalog.service.js';

@Controller('api/v1/workspaces/:workspaceId')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Post('products')
  @RequirePermission(Permission.CatalogWrite)
  createProduct(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.catalog.createProduct(
      this.scope(request, workspaceId),
      parseProduct(body),
    );
  }

  @Get('products')
  @RequirePermission(Permission.CatalogRead)
  listProducts(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.catalog.listProducts(this.scope(request, workspaceId));
  }

  @Get('products/:productId')
  @RequirePermission(Permission.CatalogRead)
  getProduct(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.catalog.getProduct(this.scope(request, workspaceId), productId);
  }

  @Post('products/:productId/versions')
  @RequirePermission(Permission.CatalogWrite)
  createVersion(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.catalog.createVersion(
      this.scope(request, workspaceId),
      productId,
      parseVersion(body),
    );
  }

  @Post('product-versions/:versionId/capabilities')
  @RequirePermission(Permission.CatalogWrite)
  addCapability(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.catalog.addCapability(
      this.scope(request, workspaceId),
      versionId,
      parseCapability(body),
    );
  }

  @Get('product-versions/:versionId/capabilities')
  @RequirePermission(Permission.CatalogRead)
  listCapabilities(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.catalog.listCapabilities(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Post('product-versions/:versionId/use-cases')
  @RequirePermission(Permission.CatalogWrite)
  addUseCase(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.catalog.addUseCase(
      this.scope(request, workspaceId),
      versionId,
      parseUseCase(body),
    );
  }

  @Get('product-versions/:versionId/use-cases')
  @RequirePermission(Permission.CatalogRead)
  listUseCases(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.catalog.listUseCases(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  private scope(request: AuthorizedRequest, workspaceId: string): CatalogScope {
    const membership = request.membership!;
    return {
      organizationId: membership.organizationId,
      workspaceId,
      subjectId: membership.subjectId,
    };
  }
}
