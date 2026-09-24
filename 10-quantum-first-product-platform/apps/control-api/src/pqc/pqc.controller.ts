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
  parseAssessment,
  parseInventoryItem,
  parseRecommendation,
  parseReviewNote,
  parseRoadmapPhase,
} from './pqc.input.js';
import { PqcService } from './pqc.service.js';

@Controller('api/v1/workspaces/:workspaceId')
export class PqcController {
  constructor(private readonly pqc: PqcService) {}

  @Post('product-versions/:versionId/pqc-assessments')
  @RequirePermission(Permission.PqcWrite)
  createAssessment(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.pqc.createAssessment(
      this.scope(request, workspaceId),
      parseAssessment(body, versionId),
    );
  }

  @Get('pqc-assessments/:assessmentId')
  @RequirePermission(Permission.PqcRead)
  getAssessment(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.pqc.getAssessment(
      this.scope(request, workspaceId),
      assessmentId,
    );
  }

  @Post('pqc-assessments/:assessmentId/inventory')
  @RequirePermission(Permission.PqcWrite)
  addInventory(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.pqc.addInventoryItem(
      this.scope(request, workspaceId),
      assessmentId,
      parseInventoryItem(body),
    );
  }

  @Post('pqc-assessments/:assessmentId/recommendations')
  @RequirePermission(Permission.PqcWrite)
  addRecommendation(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.pqc.addRecommendation(
      this.scope(request, workspaceId),
      assessmentId,
      parseRecommendation(body),
    );
  }

  @Post('pqc-assessments/:assessmentId/roadmap')
  @RequirePermission(Permission.PqcWrite)
  addRoadmapPhase(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.pqc.addRoadmapPhase(
      this.scope(request, workspaceId),
      assessmentId,
      parseRoadmapPhase(body),
    );
  }

  @Post('pqc-assessments/:assessmentId/review')
  @RequirePermission(Permission.PqcReview)
  reviewAssessment(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
    @Body() body: unknown,
  ) {
    return this.pqc.reviewAssessment(
      this.scope(request, workspaceId),
      assessmentId,
      parseReviewNote(body),
    );
  }

  @Post('pqc-assessments/:assessmentId/report-builds')
  @RequirePermission(Permission.PqcPublish)
  buildReport(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('assessmentId', new ParseUUIDPipe({ version: '4' }))
    assessmentId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.pqc.buildReport(this.scope(request, workspaceId), assessmentId);
  }

  @Post('pqc-report-builds/:buildId/publish')
  @RequirePermission(Permission.PqcPublish)
  publishReport(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string,
    @Req() request: AuthorizedRequest,
  ) {
    return this.pqc.publishReport(this.scope(request, workspaceId), buildId);
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

@Controller('api/v1/public/pqc-reports')
export class PublicPqcController {
  constructor(private readonly pqc: PqcService) {}

  @Get(':buildId')
  @PublicRoute()
  getPublished(
    @Param('buildId', new ParseUUIDPipe({ version: '4' })) buildId: string,
  ) {
    return this.pqc.getPublicReport(buildId);
  }
}
