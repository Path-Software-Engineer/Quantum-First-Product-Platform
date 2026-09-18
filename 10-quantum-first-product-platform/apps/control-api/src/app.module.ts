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
import { CatalogController } from './catalog/catalog.controller.js';
import { CatalogRepository } from './catalog/catalog.repository.js';
import { CatalogService } from './catalog/catalog.service.js';
import { DatabaseService } from './database/database.service.js';
import {
  PublicOnePagerController,
  PublishingController,
} from './publishing/publishing.controller.js';
import { PublishingRepository } from './publishing/publishing.repository.js';
import { PublishingService } from './publishing/publishing.service.js';

@Module({
  imports: [],
  controllers: [
    AppController,
    AccessController,
    CatalogController,
    PublishingController,
    PublicOnePagerController,
  ],
  providers: [
    AppService,
    DatabaseService,
    IdentityService,
    MembershipRepository,
    AuthorizationService,
    AuthGuard,
    WorkspacePermissionGuard,
    CatalogRepository,
    CatalogService,
    PublishingRepository,
    PublishingService,
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: WorkspacePermissionGuard },
  ],
})
export class AppModule {}
