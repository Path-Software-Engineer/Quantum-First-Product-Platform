import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { App } from 'supertest/types';
import { MembershipRepository } from '../src/auth/membership.repository.js';
import { AppModule } from './../src/app.module.js';

const workspaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const organizationId = '11111111-1111-4111-8111-111111111111';
const authSecret = 'e2e-secret-that-is-longer-than-thirty-two-characters';

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

  it('/v1/workspaces/:id/access denies a missing bearer token', () => {
    return request(app.getHttpServer())
      .get(`/v1/workspaces/${workspaceId}/access`)
      .expect(401)
      .expect(({ body }) =>
        expect(body.message).toBe('Bearer access token required'),
      );
  });

  it('/v1/workspaces/:id/access returns permissions from membership', async () => {
    return request(app.getHttpServer())
      .get(`/v1/workspaces/${workspaceId}/access`)
      .set('Authorization', `Bearer ${await token()}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe('editor');
        expect(body.permissions).toContain('catalog:write');
        expect(body.permissions).not.toContain('claim:review');
      });
  });

  it('/v1/workspaces/:id/access denies a valid actor outside the workspace', async () => {
    return request(app.getHttpServer())
      .get('/v1/workspaces/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/access')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(403);
  });

  it('/v1/workspaces/:id/access rejects a malformed workspace ID', async () => {
    return request(app.getHttpServer())
      .get('/v1/workspaces/not-a-uuid/access')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });
});
