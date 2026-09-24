import { SignJWT } from 'jose';
import { IdentityService } from './identity.service.js';

const secret = 'development-secret-that-is-longer-than-thirty-two-characters';
const issuer = 'urn:p10:test';
const audience = 'urn:p10:control-api';

describe('IdentityService', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEVELOPMENT_SECRET = secret;
    process.env.AUTH_ISSUER = issuer;
    process.env.AUTH_AUDIENCE = audience;
    delete process.env.AUTH_JWKS_URL;
  });

  afterAll(() => {
    process.env = original;
  });

  async function token(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      organization_id: '11111111-1111-4111-8111-111111111111',
      ...overrides,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('actor-1')
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(new TextEncoder().encode(secret));
  }

  it('returns only validated identity claims', async () => {
    await expect(new IdentityService().verify(await token())).resolves.toEqual({
      subjectId: 'actor-1',
      organizationId: '11111111-1111-4111-8111-111111111111',
      issuer,
    });
  });

  it('rejects the wrong audience and missing organization claim', async () => {
    const wrongAudience = await new SignJWT({
      organization_id: '11111111-1111-4111-8111-111111111111',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('actor-1')
      .setIssuer(issuer)
      .setAudience('urn:wrong')
      .setIssuedAt()
      .setExpirationTime('5 minutes')
      .sign(new TextEncoder().encode(secret));
    await expect(new IdentityService().verify(wrongAudience)).rejects.toThrow();
    await expect(
      new IdentityService().verify(await token({ organization_id: undefined })),
    ).rejects.toThrow();
  });

  it('forbids the local shared secret in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(new IdentityService().verify(await token())).rejects.toThrow(
      'AUTH_DEVELOPMENT_SECRET is forbidden in production',
    );
  });
});
