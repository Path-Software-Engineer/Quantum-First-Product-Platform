import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface EventPublisher {
  publish(
    event: Readonly<{
      eventId: string;
      eventType: string;
      payload: Record<string, unknown>;
    }>,
  ): Promise<void>;
}

export class ConsoleEventPublisher implements EventPublisher {
  async publish(
    event: Readonly<{
      eventId: string;
      eventType: string;
      payload: Record<string, unknown>;
    }>,
  ) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}

@Injectable()
export class OutboxWorker {
  constructor(private readonly database: DatabaseService) {}

  async dispatchOrganization(
    organizationId: string,
    publisher: EventPublisher,
    limit = 25,
  ) {
    return this.database.withTenant(organizationId, async (client) => {
      const result = await client.query(
        `SELECT event_id, event_type, payload FROM outbox_events
         WHERE organization_id=$1 AND published_at IS NULL
           AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
         ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $2`,
        [organizationId, limit],
      );
      let published = 0;
      for (const row of result.rows) {
        await client.query(
          `UPDATE outbox_events SET claimed_at=now(), attempts=attempts+1 WHERE organization_id=$1 AND event_id=$2`,
          [organizationId, row.event_id],
        );
        try {
          await publisher.publish({
            eventId: row.event_id,
            eventType: row.event_type,
            payload: row.payload,
          });
          await client.query(
            `UPDATE outbox_events SET published_at=now(), last_error=NULL WHERE organization_id=$1 AND event_id=$2`,
            [organizationId, row.event_id],
          );
          published += 1;
        } catch (error) {
          await client.query(
            `UPDATE outbox_events SET claimed_at=NULL, last_error=$3 WHERE organization_id=$1 AND event_id=$2`,
            [
              organizationId,
              row.event_id,
              error instanceof Error
                ? error.message
                : 'Unknown publisher error',
            ],
          );
        }
      }
      return { claimed: result.rowCount ?? 0, published };
    });
  }
}
