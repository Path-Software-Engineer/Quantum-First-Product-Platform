import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { isRole, type Role } from './actor.js';

export type Membership = Readonly<{
  organizationId: string;
  workspaceId: string;
  subjectId: string;
  role: Role;
}>;

@Injectable()
export class MembershipRepository {
  constructor(private readonly database: DatabaseService) {}

  async findActive(
    organizationId: string,
    workspaceId: string,
    subjectId: string,
  ): Promise<Membership | null> {
    return this.database.withTenant(organizationId, async (client) => {
      const result = await client.query<{
        organization_id: string;
        workspace_id: string;
        subject_id: string;
        role: string;
      }>(
        `SELECT organization_id, workspace_id, subject_id, role
         FROM memberships
         WHERE organization_id = $1 AND workspace_id = $2
           AND subject_id = $3 AND status = 'active'`,
        [organizationId, workspaceId, subjectId],
      );
      const row = result.rows[0];
      if (!row) return null;
      if (!isRole(row.role))
        throw new Error('Stored membership role is invalid');
      return {
        organizationId: row.organization_id,
        workspaceId: row.workspace_id,
        subjectId: row.subject_id,
        role: row.role,
      };
    });
  }
}
