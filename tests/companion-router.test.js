import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { routeCompanionModel, routeCompanionRequest } from '../lib/search/companion-router.ts';

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

describe('Twiga companion model routing', () => {
  test('ordinary chat remains on the standard value model', () => {
    assert.deepEqual(routeCompanionModel('Help me write a polite message to my landlord.'), {
      tier: 'standard',
      reason: 'standard',
    });
  });

  test('explicit deep analysis escalates to the reasoning model', () => {
    assert.deepEqual(routeCompanionModel('Think deeply and analyse in depth why this business is losing money.'), {
      tier: 'reasoning',
      reason: 'explicit-deep-reasoning',
    });
  });

  test('comparative decisions escalate in English and Kiswahili', () => {
    assert.equal(
      routeCompanionModel('Compare these hosting options and evaluate the trade-offs for our startup.').tier,
      'reasoning',
    );
    assert.equal(
      routeCompanionModel('Linganisha chaguo hizi na tathmini faida na hasara kwa biashara yetu.').tier,
      'reasoning',
    );
  });

  test('complex planning escalates without catching simple planning', () => {
    assert.equal(routeCompanionModel('Create a market-entry strategy for Tanzania.').tier, 'reasoning');
    assert.equal(routeCompanionModel('Help me plan dinner tonight without browsing.').tier, 'standard');
  });
});
