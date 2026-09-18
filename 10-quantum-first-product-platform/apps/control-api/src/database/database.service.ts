import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool?: Pool;

  private getPool(): Pool {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    this.pool ??= new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 2_000,
    });
    return this.pool;
  }

  async query<Row extends QueryResultRow>(
    text: string,
  ): Promise<QueryResult<Row>> {
    return this.getPool().query<Row>(text);
  }

  async assertRuntimeSecurity(): Promise<void> {
    const result = await this.query<{
      safe_role: boolean;
      inherits_runtime: boolean;
      owns_memberships: boolean;
    }>(`SELECT
      NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
      pg_has_role(current_user, 'p10_runtime', 'member') AS inherits_runtime,
      r.oid = c.relowner AS owns_memberships
    FROM pg_roles r CROSS JOIN pg_class c
    WHERE r.rolname = current_user AND c.oid = 'memberships'::regclass`);
    const role = result.rows[0];
    if (!role?.safe_role || !role.inherits_runtime || role.owns_memberships) {
      throw new Error(
        'DATABASE_URL must use a non-owner p10_runtime member without RLS bypass',
      );
    }
  }

  async withTenant<T>(
    organizationId: string,
    action: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.organization_id', $1, true)`, [
        organizationId,
      ]);
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
