import { readFile } from 'node:fs/promises';
import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export async function configureOpenApi(app: INestApplication): Promise<void> {
  const documentationPath = process.env.SWAGGER_PATH ?? 'docs';
  const contractUrl = new URL(
    '../../../../contracts/openapi.json',
    import.meta.url,
  );
  const document = JSON.parse(
    await readFile(contractUrl, 'utf8'),
  ) as OpenAPIObject;
  SwaggerModule.setup(documentationPath, app, document, {
    jsonDocumentUrl: 'openapi.json',
    customSiteTitle: 'Quantum-First Control API',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: false,
    },
  });
}
