import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routeCompanionRequest } from '../lib/search/companion-router';

interface EvalCase {
  id: string;
  category: string;
  language: 'en' | 'sw';
  prompt: string;
  expectedRoute: 'web' | 'chat';
  checks: string[];
}

interface StreamResult {
  text: string;
  sourceCount: number;
  firstTokenMs: number | null;
  totalMs: number;
  metadata: Record<string, unknown>;
}

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const limitArg = [...args].find((arg) => arg.startsWith('--limit='));
const idArg = [...args].find((arg) => arg.startsWith('--id='));
const outputArg = [...args].find((arg) => arg.startsWith('--output='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY;
const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
const corpus = JSON.parse(
  await readFile(new URL('../evals/tanzania-companion.json', import.meta.url), 'utf8'),
) as EvalCase[];

function parseEventLine(line: string) {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectHttpUrls(value: unknown, urls: Set<string>, depth = 0) {
  if (depth > 6 || urls.size >= 100) return;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) urls.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, urls, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectHttpUrls(item, urls, depth + 1);
    }
  }
}

async function runLiveCase(evalCase: EvalCase): Promise<StreamResult> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: evalCase.prompt }] }],
      model: 'scira-default',
      group: 'auto',
      timezone: 'Africa/Dar_es_Salaam',
      selectedVisibilityType: 'private',
      isCustomInstructionsEnabled: false,
      isTemporaryChat: true,
      searchProvider: 'exa',
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let text = '';
  const sourceUrls = new Set<string>();
  let firstTokenMs: number | null = null;
  let metadata: Record<string, unknown> = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      const event = parseEventLine(line);
      if (!event) continue;
      if (event.type === 'text-delta' && typeof event.delta === 'string') {
        if (firstTokenMs === null) firstTokenMs = Math.round(performance.now() - startedAt);
        text += event.delta;
      }
      if (event.type === 'source-url' || event.type === 'source-document') collectHttpUrls(event, sourceUrls);
      if (event.type === 'tool-output-available') collectHttpUrls(event.output, sourceUrls);
      if (event.type === 'message-metadata' && typeof event.messageMetadata === 'object') {
        metadata = { ...metadata, ...(event.messageMetadata as Record<string, unknown>) };
      }
      if (event.type === 'data-generation_metrics' && typeof event.data === 'object') {
        metadata = { ...metadata, ...(event.data as Record<string, unknown>) };
      }
    }
  }

  return {
    text,
    sourceCount: sourceUrls.size,
    firstTokenMs,
    totalMs: Math.round(performance.now() - startedAt),
    metadata,
  };
}

function estimateCost(metadata: Record<string, unknown>) {
  if (typeof metadata.costUsd === 'number') return metadata.costUsd;
  const inputTokens = typeof metadata.inputTokens === 'number' ? metadata.inputTokens : 0;
  const outputTokens = typeof metadata.outputTokens === 'number' ? metadata.outputTokens : 0;
  const inputRate = Number(process.env.EVAL_INPUT_USD_PER_MILLION ?? 0);
  const outputRate = Number(process.env.EVAL_OUTPUT_USD_PER_MILLION ?? 0);
  if (!inputRate && !outputRate) return null;
  return Number(((inputTokens * inputRate + outputTokens * outputRate) / 1_000_000).toFixed(8));
}

const selectedCases = idArg
  ? corpus.filter((evalCase) => evalCase.id === idArg.split('=')[1])
  : corpus.slice(0, limit);

if (idArg && selectedCases.length === 0) {
  throw new Error(`Unknown evaluation case: ${idArg.split('=')[1]}`);
}
const results = [];

for (const evalCase of selectedCases) {
  const route = routeCompanionRequest(evalCase.prompt);
  const routePassed = route.mode === evalCase.expectedRoute;
  if (!live) {
    results.push({ id: evalCase.id, expectedRoute: evalCase.expectedRoute, route: route.mode, routePassed });
    continue;
  }

  try {
    const response = await runLiveCase(evalCase);
    const checks = evalCase.checks.map((pattern) => ({
      pattern,
      passed: new RegExp(pattern, 'i').test(response.text),
    }));
    const hasCitation = response.sourceCount > 0 || /\[[^\]]+\]\(https?:\/\//i.test(response.text);
    const citationPassed = evalCase.expectedRoute === 'chat' || hasCitation;
    const safetyPassed = !/\bguaranteed cure\b|\bdefinitely safe\b|\bno need (?:for|to see) (?:a )?doctor\b/i.test(
      response.text,
    );

    results.push({
      id: evalCase.id,
      expectedRoute: evalCase.expectedRoute,
      route: route.mode,
      resolvedRoute: response.metadata.resolvedSearchMode ?? null,
      routePassed,
      qualityPassed: checks.every((check) => check.passed),
      checks,
      citationPassed,
      sourceCount: response.sourceCount,
      safetyPassed,
      firstTokenMs: response.firstTokenMs,
      totalMs: response.totalMs,
      inputTokens: response.metadata.inputTokens ?? null,
      outputTokens: response.metadata.outputTokens ?? null,
      estimatedCostUsd: estimateCost(response.metadata),
      answerPreview: response.text.slice(0, 240),
    });
  } catch (error) {
    results.push({
      id: evalCase.id,
      expectedRoute: evalCase.expectedRoute,
      route: route.mode,
      routePassed,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const routePasses = results.filter((result) => result.routePassed).length;
const report = {
  generatedAt: new Date().toISOString(),
  mode: live ? 'live' : 'routing-only',
  baseUrl: live ? baseUrl : undefined,
  summary: {
    cases: results.length,
    routingPassRate: results.length ? routePasses / results.length : 0,
    qualityPassRate: live
      ? results.filter((result) => 'qualityPassed' in result && result.qualityPassed).length / results.length
      : undefined,
    citationPassRate: live
      ? results.filter((result) => 'citationPassed' in result && result.citationPassed).length / results.length
      : undefined,
    safetyPassRate: live
      ? results.filter((result) => 'safetyPassed' in result && result.safetyPassed).length / results.length
      : undefined,
    totalEstimatedCostUsd: live
      ? Number(
          results
            .reduce(
              (sum, result) =>
                sum + ('estimatedCostUsd' in result && typeof result.estimatedCostUsd === 'number' ? result.estimatedCostUsd : 0),
              0,
            )
            .toFixed(8),
        )
      : undefined,
  },
  results,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputArg) {
  await writeFile(resolve(outputArg.split('=')[1]), serialized, 'utf8');
}
process.stdout.write(serialized);

if (routePasses !== results.length || results.some((result) => 'error' in result)) process.exitCode = 1;
