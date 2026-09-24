import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Permission } from '../auth/actor.js';
import { PublicRoute, RequirePermission } from '../auth/auth.metadata.js';
import type { AuthorizedRequest } from '../auth/workspace-permission.guard.js';
import type { CatalogScope } from '../catalog/catalog.service.js';
import {
  parseApiDocument,
  parseEndpoint,
  parseError,
  parseExample,
  parseQuickstart,
  parseReviewNote,
} from './developer-docs.input.js';
import { DeveloperDocsService } from './developer-docs.service.js';

@Controller('api/v1/workspaces/:workspaceId')
export class DeveloperDocsController {
  constructor(private readonly docs: DeveloperDocsService) {}

  @Post('product-versions/:versionId/developer-docs')
  @RequirePermission(Permission.DeveloperDocsWrite)
  create(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.create(
      this.scope(request, workspaceId),
      parseApiDocument(body, versionId),
    );
  }

  @Get('developer-docs/:documentId')
  @RequirePermission(Permission.DeveloperDocsRead)
  get(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.docs.get(this.scope(request, workspaceId), documentId);
  }

  @Post('developer-docs/:documentId/endpoints')
  @RequirePermission(Permission.DeveloperDocsWrite)
  endpoint(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.addEndpoint(
      this.scope(request, workspaceId),
      documentId,
      parseEndpoint(body),
    );
  }

  @Post('developer-docs/:documentId/errors')
  @RequirePermission(Permission.DeveloperDocsWrite)
  error(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.addError(
      this.scope(request, workspaceId),
      documentId,
      parseError(body),
    );
  }

  @Post('developer-docs/:documentId/examples')
  @RequirePermission(Permission.DeveloperDocsWrite)
  example(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.addExample(
      this.scope(request, workspaceId),
      documentId,
      parseExample(body),
    );
  }

  @Put('developer-docs/:documentId/quickstart')
  @RequirePermission(Permission.DeveloperDocsWrite)
  quickstart(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.setQuickstart(
      this.scope(request, workspaceId),
      documentId,
      parseQuickstart(body),
    );
  }

  @Post('developer-docs/:documentId/review')
  @RequirePermission(Permission.DeveloperDocsReview)
  review(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.docs.review(
      this.scope(request, workspaceId),
      documentId,
      parseReviewNote(body),
    );
  }

  @Post('developer-docs/:documentId/builds')
  @RequirePermission(Permission.DeveloperDocsPublish)
  build(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.docs.build(this.scope(request, workspaceId), documentId);
  }

  @Post('developer-doc-builds/:buildId/publish')
  @RequirePermission(Permission.DeveloperDocsPublish)
  publish(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.docs.publish(this.scope(request, workspaceId), buildId);
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

@Controller('api/v1/public/developer-docs')
export class PublicDeveloperDocsController {
  constructor(private readonly docs: DeveloperDocsService) {}

  @Get(':buildId')
  @PublicRoute()
  get(@Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string) {
    return this.docs.publicBuild(buildId);
  }
}
