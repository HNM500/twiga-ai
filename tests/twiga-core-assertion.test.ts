import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createTwigaCoreAssertion } from '../lib/twiga-core/assertion';

test('creates a short-lived scoped assertion compatible with Twiga Core', () => {
  const secret = 'twiga-test-assertion-secret-at-least-32-characters';
  const token = createTwigaCoreAssertion({
    secret,
    subject: 'twiga-web:test',
    scopes: ['directory:read', 'directory:read'],
    now: 1_800_000_000,
    lifetimeSeconds: 120,
    jti: 'test-jti',
  });
  const [header, payload, signature] = token.split('.');
  assert.ok(header && payload && signature);
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  assert.deepEqual(decoded, {
    iss: 'twiga-web',
    aud: 'twiga-core',
    sub: 'twiga-web:test',
    iat: 1_800_000_000,
    exp: 1_800_000_120,
    jti: 'test-jti',
    scopes: ['directory:read'],
  });
  assert.equal(signature, createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'));
});
