import { Injectable } from '@nestjs/common';
import { Permission, rolePermissions, type Actor } from './actor.js';
import {
  MembershipRepository,
  type Membership,
} from './membership.repository.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly memberships: MembershipRepository) {}

  async authorize(
    actor: Actor,
    workspaceId: string,
    permission: Permission,
  ): Promise<Membership | null> {
    const membership = await this.memberships.findActive(
      actor.organizationId,
      workspaceId,
      actor.subjectId,
    );
    if (!membership || !rolePermissions[membership.role].includes(permission))
      return null;
    return membership;
  }
}
