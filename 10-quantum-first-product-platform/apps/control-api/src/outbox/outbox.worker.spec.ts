import { OutboxWorker } from './outbox.worker.js';

describe('outbox worker', () => {
  it('marks successfully published events and releases failed events for retry', async () => {
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: vi.fn(async (text: string, values?: unknown[]) => {
        queries.push({ text, values });
        if (text.startsWith('SELECT event_id'))
          return {
            rows: [
              {
                event_id: 'ok',
                event_type: 'docs.published',
                payload: { id: 1 },
              },
              {
                event_id: 'retry',
                event_type: 'docs.failed',
                payload: { id: 2 },
              },
            ],
            rowCount: 2,
          };
        return { rows: [], rowCount: 1 };
      }),
    };
    const database = {
      withTenant: vi.fn(async (_id, action) => action(client)),
    };
    const publisher = {
      publish: vi.fn(async (event) => {
        if (event.eventId === 'retry') throw new Error('broker unavailable');
      }),
    };
    const result = await new OutboxWorker(
      database as never,
    ).dispatchOrganization('11111111-1111-4111-8111-111111111111', publisher);
    expect(result).toEqual({ claimed: 2, published: 1 });
    expect(
      queries.some((query) => query.text.includes('published_at=now()')),
    ).toBe(true);
    expect(
      queries.some((query) => query.text.includes('claimed_at=NULL')),
    ).toBe(true);
  });
});
