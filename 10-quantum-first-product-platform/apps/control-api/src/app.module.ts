import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AccessController } from './auth/access.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthorizationService } from './auth/authorization.service.js';
import { IdentityService } from './auth/identity.service.js';
import { MembershipRepository } from './auth/membership.repository.js';
import { WorkspacePermissionGuard } from './auth/workspace-permission.guard.js';
import { DatabaseService } from './database/database.service.js';

@Module({
  imports: [],
  controllers: [AppController, AccessController],
  providers: [
    AppService,
    DatabaseService,
    IdentityService,
    MembershipRepository,
    AuthorizationService,
    AuthGuard,
    WorkspacePermissionGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: WorkspacePermissionGuard },
  ],
})
export class AppModule {}
