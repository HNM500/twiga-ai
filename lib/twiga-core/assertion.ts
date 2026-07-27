import { createHmac, randomUUID } from 'node:crypto';

const header = { alg: 'HS256', typ: 'TWIGA-ASSERTION', kid: 'v1' } as const;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createTwigaCoreAssertion(input: {
  secret: string;
  subject: string;
  scopes: string[];
  issuer?: string;
  audience?: string;
  now?: number;
  lifetimeSeconds?: number;
  jti?: string;
}): string {
  if (input.secret.length < 32) throw new Error('TWIGA_CORE_ASSERTION_SECRET must be at least 32 characters');
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const lifetimeSeconds = input.lifetimeSeconds ?? 120;
  if (lifetimeSeconds < 1 || lifetimeSeconds > 300) throw new Error('Twiga Core assertions must expire within 300 seconds');
  const encodedHeader = encode(header);
  const encodedPayload = encode({
    iss: input.issuer ?? 'twiga-web',
    aud: input.audience ?? 'twiga-core',
    sub: input.subject,
    iat: now,
    exp: now + lifetimeSeconds,
    jti: input.jti ?? randomUUID(),
    scopes: [...new Set(input.scopes)],
  });
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', input.secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}
