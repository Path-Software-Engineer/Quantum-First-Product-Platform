import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { publicRouteKey } from './auth.metadata.js';
import { IdentityService } from './identity.service.js';
import type { Actor } from './actor.js';

export type ActorRequest = Request & { actor?: Actor };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(publicRouteKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<ActorRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer ([^ ]+)$/);
    if (!match) throw new UnauthorizedException('Bearer access token required');
    try {
      request.actor = await this.identity.verify(match[1]);
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid');
    }
  }
}
