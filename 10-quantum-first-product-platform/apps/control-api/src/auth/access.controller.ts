import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { RequirePermission } from './auth.metadata.js';
import { Permission } from './actor.js';
import type { AuthorizedRequest } from './workspace-permission.guard.js';
import { WorkspacePermissionGuard } from './workspace-permission.guard.js';

@Controller('api/v1/workspaces/:workspaceId/access')
export class AccessController {
  @Get()
  @RequirePermission(Permission.CatalogRead)
  access(
    @Param('workspaceId', new ParseUUIDPipe({ version: '4' }))
    workspaceId: string,
    @Req() request: AuthorizedRequest,
  ) {
    const membership = request.membership!;
    return {
      subjectId: membership.subjectId,
      organizationId: membership.organizationId,
      workspaceId,
      role: membership.role,
      permissions: WorkspacePermissionGuard.permissionsFor(membership),
    };
  }
}
