import { SetMetadata } from '@nestjs/common';
import { Permission } from './actor.js';

export const publicRouteKey = 'p10.public';
export const requiredPermissionKey = 'p10.permission';

export const PublicRoute = () => SetMetadata(publicRouteKey, true);
export const RequirePermission = (permission: Permission) =>
  SetMetadata(requiredPermissionKey, permission);
