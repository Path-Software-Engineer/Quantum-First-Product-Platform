import { readFile } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.P10_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const workspaceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const workspaceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

integration('PostgreSQL tenancy and RLS under the runtime role', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const migration = await readFile(
      new URL('../../../infra/migrations/0001_tenancy.sql', import.meta.url),
      'utf8',
    );
    await pool.query(migration);
    await pool.query(
      `INSERT INTO organizations (organization_id, slug, display_name)
       VALUES ($1, 'synthetic-a', 'Synthetic A'), ($2, 'synthetic-b', 'Synthetic B')`,
      [orgA, orgB],
    );
    await pool.query(
      `INSERT INTO workspaces (organization_id, workspace_id, slug, display_name)
       VALUES ($1, $2, 'main', 'Workspace A'), ($3, $4, 'main', 'Workspace B')`,
      [orgA, workspaceA, orgB, workspaceB],
    );
    await pool.query(
      `INSERT INTO memberships (organization_id, workspace_id, subject_id, role)
       VALUES ($1, $2, 'synthetic-actor', 'owner'),
              ($3, $4, 'synthetic-other', 'viewer')`,
      [orgA, workspaceA, orgB, workspaceB],
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function asRuntime<T>(
    organizationId: string | null,
    action: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE p10_runtime');
      if (organizationId !== null) {
        await client.query(
          `SELECT set_config('app.organization_id', $1, true)`,
          [organizationId],
        );
      }
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

  it('uses a runtime role that cannot bypass or own tenant tables', async () => {
    const result = await pool.query(`
      SELECT r.rolbypassrls, r.rolsuper,
        r.oid = c.relowner AS owns_workspaces,
        c.relrowsecurity, c.relforcerowsecurity
      FROM pg_roles r CROSS JOIN pg_class c
      WHERE r.rolname = 'p10_runtime' AND c.oid = 'workspaces'::regclass
    `);
    expect(result.rows[0]).toEqual({
      rolbypassrls: false,
      rolsuper: false,
      owns_workspaces: false,
      relrowsecurity: true,
      relforcerowsecurity: true,
    });
  });

  it('denies reads when the tenant context is absent', async () => {
    const rows = await asRuntime(
      null,
      async (client) =>
        (await client.query('SELECT workspace_id FROM workspaces')).rows,
    );
    expect(rows).toEqual([]);
  });

  it('denies writes without a tenant context and rejects malformed context', async () => {
    await expect(
      asRuntime(null, (client) =>
        client.query(
          `INSERT INTO workspaces (organization_id, workspace_id, slug, display_name)
           VALUES ($1, gen_random_uuid(), 'no-context', 'No context')`,
          [orgA],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asRuntime('not-a-uuid', (client) =>
        client.query('SELECT * FROM workspaces'),
      ),
    ).rejects.toMatchObject({ code: '22P02' });
  });

  it('shows only the organization-scoped workspace and memberships', async () => {
    const rows = await asRuntime(orgA, async (client) => {
      const workspaces = await client.query(
        'SELECT workspace_id FROM workspaces',
      );
      const memberships = await client.query(
        'SELECT subject_id FROM memberships',
      );
      return { workspaces: workspaces.rows, memberships: memberships.rows };
    });
    expect(rows).toEqual({
      workspaces: [{ workspace_id: workspaceA }],
      memberships: [{ subject_id: 'synthetic-actor' }],
    });
  });

  it('rejects a cross-tenant insert and a mismatched workspace reference', async () => {
    await expect(
      asRuntime(orgA, (client) =>
        client.query(
          `INSERT INTO workspaces (organization_id, workspace_id, slug, display_name)
           VALUES ($1, gen_random_uuid(), 'wrong-tenant', 'Wrong')`,
          [orgB],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      asRuntime(orgA, (client) =>
        client.query(
          `INSERT INTO memberships (organization_id, workspace_id, subject_id, role)
           VALUES ($1, $2, 'wrong-reference', 'viewer')`,
          [orgA, workspaceB],
        ),
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('allows an in-tenant write but cannot update another tenant row', async () => {
    const inserted = await asRuntime(orgA, async (client) =>
      client.query(
        `INSERT INTO workspaces (organization_id, workspace_id, slug, display_name)
         VALUES ($1, gen_random_uuid(), 'extra', 'Extra') RETURNING slug`,
        [orgA],
      ),
    );
    expect(inserted.rows).toEqual([{ slug: 'extra' }]);

    const updated = await asRuntime(orgA, async (client) =>
      client.query(
        `UPDATE workspaces SET display_name = 'Incorrect' WHERE organization_id = $1
         RETURNING workspace_id`,
        [orgB],
      ),
    );
    expect(updated.rowCount).toBe(0);
    const other = await asRuntime(
      orgB,
      async (client) =>
        (
          await client.query(
            'SELECT display_name FROM workspaces WHERE workspace_id = $1',
            [workspaceB],
          )
        ).rows,
    );
    expect(other).toEqual([{ display_name: 'Workspace B' }]);
  });

  it('does not leak transaction-local context through the connection pool', async () => {
    const a = await asRuntime(
      orgA,
      async (client) =>
        (
          await client.query(
            'SELECT workspace_id FROM workspaces WHERE workspace_id = $1',
            [workspaceA],
          )
        ).rows,
    );
    const b = await asRuntime(
      orgB,
      async (client) =>
        (
          await client.query(
            'SELECT workspace_id FROM workspaces WHERE workspace_id = $1',
            [workspaceB],
          )
        ).rows,
    );
    const absent = await asRuntime(
      null,
      async (client) =>
        (await client.query('SELECT workspace_id FROM workspaces')).rows,
    );
    expect(a).toEqual([{ workspace_id: workspaceA }]);
    expect(b).toEqual([{ workspace_id: workspaceB }]);
    expect(absent).toEqual([]);
  });
});
