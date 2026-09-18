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
import { PublicRoute, RequirePermission } from '../auth/auth.metadata.js';
import type { AuthorizedRequest } from '../auth/workspace-permission.guard.js';
import type { CatalogScope } from '../catalog/catalog.service.js';
import {
  parseClaim,
  parseEvidence,
  parseReview,
  parseScenario,
} from './publishing.input.js';
import { PublishingService } from './publishing.service.js';

@Controller('api/v1/workspaces/:workspaceId')
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}

  @Post('product-versions/:versionId/evidence')
  @RequirePermission(Permission.ClaimSubmit)
  createEvidence(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.publishing.createEvidence(
      this.scope(request, workspaceId),
      versionId,
      parseEvidence(body),
    );
  }

  @Post('product-versions/:versionId/claims')
  @RequirePermission(Permission.ClaimSubmit)
  createClaim(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.publishing.createClaim(
      this.scope(request, workspaceId),
      versionId,
      parseClaim(body),
    );
  }

  @Get('product-versions/:versionId/claims')
  @RequirePermission(Permission.CatalogRead)
  listClaims(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.listClaims(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Post('product-versions/:versionId/commercial-scenarios')
  @RequirePermission(Permission.CatalogWrite)
  createScenario(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.publishing.createScenario(
      this.scope(request, workspaceId),
      versionId,
      parseScenario(body),
    );
  }

  @Post('product-versions/:versionId/submit')
  @RequirePermission(Permission.ClaimSubmit)
  submitVersion(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.submitVersion(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Post('claims/:claimId/review')
  @RequirePermission(Permission.ClaimReview)
  reviewClaim(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('claimId', new ParseUUIDPipe({ version: '4' })) claimId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    const review = parseReview(body);
    return this.publishing.reviewClaim(
      this.scope(request, workspaceId),
      claimId,
      review.decision,
      review.note,
    );
  }

  @Post('product-versions/:versionId/approve')
  @RequirePermission(Permission.ClaimReview)
  approveVersion(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.approveVersion(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Post('product-versions/:versionId/publish')
  @RequirePermission(Permission.OnePagerPublish)
  publishVersion(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.publishVersion(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Post('product-versions/:versionId/one-pager-builds')
  @RequirePermission(Permission.OnePagerPublish)
  buildOnePager(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.buildOnePager(
      this.scope(request, workspaceId),
      versionId,
    );
  }

  @Get('one-pager-builds/:buildId')
  @RequirePermission(Permission.CatalogRead)
  getBuild(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.getBuild(this.scope(request, workspaceId), buildId);
  }

  @Get('audit-events')
  @RequirePermission(Permission.ClaimReview)
  listAuditEvents(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.publishing.listAuditEvents(this.scope(request, workspaceId));
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

@Controller('api/v1/public/one-pagers')
export class PublicOnePagerController {
  constructor(private readonly publishing: PublishingService) {}

  @Get(':buildId')
  @PublicRoute()
  getPublished(
    @Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string,
  ) {
    return this.publishing.getPublicBuild(buildId);
  }
}
