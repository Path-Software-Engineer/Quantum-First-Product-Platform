import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.PORTAL_ORIGIN ?? 'http://127.0.0.1:3000',
  });
  await app.listen(process.env.PORT ?? 8080, '0.0.0.0');
}
await bootstrap();
