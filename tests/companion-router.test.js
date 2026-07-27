import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { routeCompanionRequest } from '../lib/search/companion-router.ts';

const cases = JSON.parse(readFileSync(new URL('../evals/tanzania-companion.json', import.meta.url), 'utf8'));

describe('Twiga companion routing', () => {
  for (const evalCase of cases) {
    test(`${evalCase.id} routes to ${evalCase.expectedRoute}`, () => {
      assert.equal(routeCompanionRequest(evalCase.prompt).mode, evalCase.expectedRoute);
    });
  }

  test('an explicit no-web request takes priority over time-sensitive words', () => {
    assert.equal(
      routeCompanionRequest("Don't browse the web; help me phrase a question about today's news.").mode,
      'chat',
    );
  });

  test('Tanzania travel planning uses current web research', () => {
    assert.equal(routeCompanionRequest('Plan a three-day trip to Zanzibar on a budget.').mode, 'web');
  });
});
