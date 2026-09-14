import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AppService {
  live(): { status: 'ok'; service: 'control-api' } {
    return { status: 'ok', service: 'control-api' };
  }

  async ready(): Promise<{ status: 'ok'; database: 'connected' }> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2000 });
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } finally {
      await pool.end();
    }
  }
}
