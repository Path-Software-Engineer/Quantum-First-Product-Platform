import type { DeveloperDocsSnapshot } from './developer-docs.model.js';

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function renderMarkdown(snapshot: DeveloperDocsSnapshot): string {
  const { document, endpoints, errors, examples, quickstart } = snapshot;
  const lines = [
    `# ${document.apiName} API`,
    '',
    `> Version ${document.apiVersion} · ${document.serviceStatus}`,
    '',
    document.description,
    '',
    '## Before you call the API',
    '',
    `- Base URL: \`${document.baseUrl}\``,
    `- Authentication: ${document.authModel}`,
    `- Limits: ${document.rateLimits}`,
    '',
    '## Quickstart',
    '',
    quickstart.installation,
    '',
    '```bash',
    quickstart.firstCall,
    '```',
    '',
    `Expected result: ${quickstart.expectedResult}`,
    '',
    `Next: ${quickstart.nextStep}`,
    '',
    `Troubleshooting: ${quickstart.troubleshooting}`,
    '',
    '## Endpoint reference',
  ];
  for (const endpoint of endpoints) {
    lines.push(
      '',
      `### ${endpoint.method} ${endpoint.path}`,
      '',
      endpoint.summary,
      '',
      endpoint.description,
      '',
      `Use case: ${endpoint.useCase}`,
      '',
      `Tags: ${endpoint.tags.join(', ')}`,
      '',
      'Parameters:',
      '',
      '```json',
      json(endpoint.parameters),
      '```',
      '',
      'Request schema:',
      '',
      '```json',
      json(endpoint.requestSchema),
      '```',
      '',
      'Response schema:',
      '',
      '```json',
      json(endpoint.responseSchema),
      '```',
    );
  }
  lines.push('', '## Errors');
  for (const error of errors) {
    lines.push(
      '',
      `### ${error.httpStatus} ${error.errorCode}${error.isCommon ? ' (common)' : ''}`,
      '',
      error.message,
      '',
      `Cause: ${error.cause}`,
      '',
      `Resolution: ${error.suggestedSolution}`,
      '',
      '```json',
      json(error.example),
      '```',
    );
  }
  lines.push('', '## Examples');
  for (const example of examples) {
    lines.push(
      '',
      `### ${example.title}`,
      '',
      `\`\`\`${example.language === 'curl' ? 'bash' : 'python'}`,
      example.requestSample,
      '```',
      '',
      'Response:',
      '',
      '```json',
      example.responseSample,
      '```',
      '',
      example.notes,
    );
  }
  lines.push('', '## Limits and provenance', '', snapshot.limitations, '');
  return lines.join('\n');
}
