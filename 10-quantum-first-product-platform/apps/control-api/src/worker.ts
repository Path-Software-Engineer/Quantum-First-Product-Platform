import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConsoleEventPublisher, OutboxWorker } from './outbox/outbox.worker.js';

const organizations = (process.env.P10_OUTBOX_ORGANIZATION_IDS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (organizations.length === 0) {
  throw new Error(
    'P10_OUTBOX_ORGANIZATION_IDS must list the tenant UUIDs assigned to this worker',
  );
}

const context = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
try {
  const worker = context.get(OutboxWorker);
  const publisher = new ConsoleEventPublisher();
  for (const organizationId of organizations) {
    const result = await worker.dispatchOrganization(organizationId, publisher);
    process.stdout.write(`${JSON.stringify({ organizationId, ...result })}\n`);
  }
} finally {
  await context.close();
}
