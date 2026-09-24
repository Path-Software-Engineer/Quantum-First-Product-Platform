import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { Actor, isUuid } from './actor.js';

type VerificationKey = Uint8Array | JWTVerifyGetKey;

@Injectable()
export class IdentityService {
  private remoteKey?: JWTVerifyGetKey;

  async verify(accessToken: string): Promise<Actor> {
    const developmentSecret = process.env.AUTH_DEVELOPMENT_SECRET;
    const production = process.env.NODE_ENV === 'production';
    const issuer =
      process.env.AUTH_ISSUER ??
      (production ? undefined : 'urn:p10:development');
    const audience =
      process.env.AUTH_AUDIENCE ??
      (production ? undefined : 'urn:p10:control-api');

    if (!issuer || !audience) {
      throw new Error(
        'AUTH_ISSUER and AUTH_AUDIENCE are required in production',
      );
    }

    if (production && developmentSecret) {
      throw new Error('AUTH_DEVELOPMENT_SECRET is forbidden in production');
    }

    let key: VerificationKey;
    let algorithms: string[];
    if (developmentSecret) {
      if (developmentSecret.length < 32) {
        throw new Error(
          'AUTH_DEVELOPMENT_SECRET must contain at least 32 characters',
        );
      }
      key = new TextEncoder().encode(developmentSecret);
      algorithms = ['HS256'];
    } else {
      const jwksUrl = process.env.AUTH_JWKS_URL;
      if (!jwksUrl) {
        throw new Error(
          'AUTH_JWKS_URL is required when the development issuer is disabled',
        );
      }
      const url = new URL(jwksUrl);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.hash
      ) {
        throw new Error('AUTH_JWKS_URL must be a credential-free HTTPS URL');
      }
      this.remoteKey ??= createRemoteJWKSet(url, { timeoutDuration: 3_000 });
      key = this.remoteKey;
      algorithms = ['RS256', 'ES256'];
    }

    const { payload } = await jwtVerify(accessToken, key, {
      issuer,
      audience,
      algorithms,
      requiredClaims: ['sub', 'iat', 'exp', 'organization_id'],
      maxTokenAge: '20 minutes',
      clockTolerance: 5,
    });
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      payload.sub.length > 255 ||
      typeof payload.organization_id !== 'string' ||
      !isUuid(payload.organization_id)
    ) {
      throw new Error('JWT identity claims are invalid');
    }
    return {
      subjectId: payload.sub,
      organizationId: payload.organization_id,
      issuer,
    };
  }
}
