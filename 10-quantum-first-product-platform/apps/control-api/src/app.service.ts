import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Injectable()
export class AppService {
  constructor(private readonly database: DatabaseService) {}

  live(): { status: 'ok'; service: 'control-api' } {
    return { status: 'ok', service: 'control-api' };
  }

  async ready(): Promise<{ status: 'ok'; database: 'connected' }> {
    await this.database.assertRuntimeSecurity();
    await this.database.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  }
}
