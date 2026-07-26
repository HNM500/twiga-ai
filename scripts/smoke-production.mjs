const appUrl = (process.env.APP_URL || 'https://twiga.ai').replace(/\/$/, '');
const expectedSourceUrl = process.env.EXPECTED_SOURCE_URL || 'github.com/HNM500/twiga-ai/tree/';

const checks = [
  { path: '/api/health', contains: '"status":"ok"' },
  { path: '/', contains: 'Twiga AI' },
  { path: '/about', contains: expectedSourceUrl },
  { path: '/terms', contains: 'Current MVP terms' },
  { path: '/privacy-policy', contains: 'OpenRouter' },
  { path: '/api/auth/get-session', contains: 'null' },
];

const failures = [];

await Promise.all(
  checks.map(async ({ path, contains }) => {
    const startedAt = Date.now();

    try {
      const response = await fetch(`${appUrl}${path}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'twiga-production-smoke/1.0' },
      });
      const body = await response.text();
      const durationMs = Date.now() - startedAt;

      if (!response.ok || !body.includes(contains)) {
        failures.push(`${path}: status=${response.status}, expected=${JSON.stringify(contains)}`);
        return;
      }

      process.stdout.write(`PASS ${path} ${response.status} ${durationMs}ms\n`);
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }),
);

if (failures.length > 0) {
  process.stderr.write(
    `Production smoke checks failed for ${appUrl}:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  );
  process.exit(1);
}

process.stdout.write(`All production smoke checks passed for ${appUrl}.\n`);
