import { Permission } from './actor.js';
import { AuthorizationService } from './authorization.service.js';
import type { MembershipRepository } from './membership.repository.js';

const actor = {
  subjectId: 'actor-1',
  organizationId: '11111111-1111-4111-8111-111111111111',
  issuer: 'urn:p10:test',
};
const workspaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('AuthorizationService', () => {
  it.each([
    ['owner', Permission.OnePagerPublish, true],
    ['editor', Permission.CatalogWrite, true],
    ['editor', Permission.ClaimReview, false],
    ['reviewer', Permission.ClaimReview, true],
    ['viewer', Permission.CatalogWrite, false],
  ] as const)(
    '%s and %s produces allowed=%s',
    async (role, permission, allowed) => {
      const membership = { ...actor, workspaceId, role };
      const repository = {
        findActive: vi.fn().mockResolvedValue(membership),
      } as unknown as MembershipRepository;
      const result = await new AuthorizationService(repository).authorize(
        actor,
        workspaceId,
        permission,
      );
      expect(Boolean(result)).toBe(allowed);
      expect(repository.findActive).toHaveBeenCalledWith(
        actor.organizationId,
        workspaceId,
        actor.subjectId,
      );
    },
  );

  it('denies an absent or suspended membership represented as no active result', async () => {
    const repository = {
      findActive: vi.fn().mockResolvedValue(null),
    } as unknown as MembershipRepository;
    await expect(
      new AuthorizationService(repository).authorize(
        actor,
        workspaceId,
        Permission.CatalogRead,
      ),
    ).resolves.toBeNull();
  });
});
