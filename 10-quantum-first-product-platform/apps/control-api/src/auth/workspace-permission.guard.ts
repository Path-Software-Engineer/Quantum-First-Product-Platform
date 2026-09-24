import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { requiredPermissionKey } from './auth.metadata.js';
import { isUuid, Permission, rolePermissions } from './actor.js';
import type { ActorRequest } from './auth.guard.js';
import { AuthorizationService } from './authorization.service.js';
import type { Membership } from './membership.repository.js';

export type AuthorizedRequest = ActorRequest & { membership?: Membership };

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission>(
      requiredPermissionKey,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const workspaceId = request.params.workspaceId;
    if (!request.actor || typeof workspaceId !== 'string') {
      throw new ForbiddenException('Workspace access denied');
    }
    if (!isUuid(workspaceId)) {
      throw new BadRequestException('Workspace ID must be a UUID');
    }
    const membership = await this.authorization.authorize(
      request.actor,
      workspaceId,
      permission,
    );
    if (!membership) throw new ForbiddenException('Workspace access denied');
    request.membership = membership;
    return true;
  }

  static permissionsFor(membership: Membership): readonly Permission[] {
    return rolePermissions[membership.role];
  }
}
