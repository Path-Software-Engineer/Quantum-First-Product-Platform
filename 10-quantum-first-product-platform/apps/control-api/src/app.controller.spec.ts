import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseService } from './database/database.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: { query: vi.fn(), assertRuntimeSecurity: vi.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('liveness', () => {
    it('reports the actual API process without claiming database readiness', () => {
      expect(appController.live()).toEqual({
        status: 'ok',
        service: 'control-api',
      });
    });
  });
});
