import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { App } from 'supertest/types';
import { MembershipRepository } from '../src/auth/membership.repository.js';
import { CatalogRepository } from '../src/catalog/catalog.repository.js';
import { PublishingRepository } from '../src/publishing/publishing.repository.js';
import { AppModule } from './../src/app.module.js';

const workspaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const organizationId = '11111111-1111-4111-8111-111111111111';
const authSecret = 'e2e-secret-that-is-longer-than-thirty-two-characters';
const productId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const buildId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const originalEnvironment = { ...process.env };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEVELOPMENT_SECRET = authSecret;
    process.env.AUTH_ISSUER = 'urn:p10:e2e';
    process.env.AUTH_AUDIENCE = 'urn:p10:control-api';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MembershipRepository)
      .useValue({
        findActive: vi.fn(
          async (organization: string, workspace: string, subject: string) =>
            organization === organizationId &&
            workspace === workspaceId &&
            subject === 'actor-1'
              ? {
                  organizationId,
                  workspaceId,
                  subjectId: subject,
                  role: 'editor',
                }
              : null,
        ),
      })
      .overrideProvider(CatalogRepository)
      .useValue({
        createProduct: vi.fn(async (_scope, input) => ({
          productId,
          ...input,
          createdBy: 'actor-1',
          createdAt: '2026-09-18T00:00:00.000Z',
        })),
        listProducts: vi.fn(async () => []),
        getProduct: vi.fn(async () => null),
        createVersion: vi.fn(async () => null),
        addCapability: vi.fn(async () => null),
        listCapabilities: vi.fn(async () => null),
        addUseCase: vi.fn(async () => null),
        listUseCases: vi.fn(async () => null),
      })
      .overrideProvider(PublishingRepository)
      .useValue({
        getPublicBuild: vi.fn(async (requestedId: string) =>
          requestedId === buildId
            ? {
                buildId,
                sourceSnapshot: { schemaVersion: 'p10.one-pager.v1' },
                sourceSha256: 'a'.repeat(64),
                publishedAt: '2026-09-18T00:00:00.000Z',
              }
            : null,
        ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  async function token(): Promise<string> {
    return new SignJWT({ organization_id: organizationId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('actor-1')
      .setIssuer('urn:p10:e2e')
      .setAudience('urn:p10:control-api')
      .setIssuedAt()
      .setExpirationTime('5 minutes')
      .sign(new TextEncoder().encode(authSecret));
  }

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok', service: 'control-api' });
  });

  it('/health/ready refuses to claim readiness without PostgreSQL', () => {
    return request(app.getHttpServer()).get('/health/ready').expect(503);
  });

  it('/api/v1/workspaces/:id/access denies a missing bearer token', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/access`)
      .expect(401)
      .expect(({ body }) =>
        expect(body.message).toBe('Bearer access token required'),
      );
  });

  it('/api/v1/workspaces/:id/access returns permissions from membership', async () => {
    return request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/access`)
      .set('Authorization', `Bearer ${await token()}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe('editor');
        expect(body.permissions).toContain('catalog:write');
        expect(body.permissions).not.toContain('claim:review');
      });
  });

  it('/api/v1/workspaces/:id/access denies a valid actor outside the workspace', async () => {
    return request(app.getHttpServer())
      .get('/api/v1/workspaces/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/access')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(403);
  });

  it('/api/v1/workspaces/:id/access rejects a malformed workspace ID', async () => {
    return request(app.getHttpServer())
      .get('/api/v1/workspaces/not-a-uuid/access')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(400);
  });

  it('creates a validated workspace-scoped product for an editor', async () => {
    return request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/products`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({
        slug: 'quantum-planner',
        displayName: 'Quantum Planner',
        summary: 'Synthetic catalog entry used only by the test suite.',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          productId,
          slug: 'quantum-planner',
          createdBy: 'actor-1',
        });
      });
  });

  it('rejects an invalid product before persistence', async () => {
    return request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/products`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({ slug: 'Not valid', displayName: 'Invalid', summary: 'Invalid' })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'slug must be a lowercase kebab-case identifier',
        ),
      );
  });

  it('serves only an existing published one-pager without authentication', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/public/one-pagers/${buildId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.buildId).toBe(buildId);
        expect(body.sourceSnapshot.schemaVersion).toBe('p10.one-pager.v1');
      });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });
});
