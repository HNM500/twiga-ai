import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateAddress(address: string) {
  if (address === '::' || address === '::1') return true;

  const normalized = address.toLowerCase();
  if (
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  ) {
    return true;
  }

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const candidate = mappedIpv4 ?? normalized;
  if (isIP(candidate) !== 4) return false;

  const [a, b] = candidate.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function validateMcpServerUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');
  const isDev = process.env.NODE_ENV !== 'production';
  const isHttps = parsed.protocol === 'https:';
  const isAllowedLocalHttp = isDev && isLocalhost && parsed.protocol === 'http:';

  if (!isHttps && !isAllowedLocalHttp) {
    throw new Error('Only https URLs are allowed in production (http localhost allowed in development)');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Credentials must not be embedded in MCP URLs');
  }

  if (!isDev && (isLocalhost || isPrivateAddress(hostname))) {
    throw new Error('Private, local, and link-local MCP addresses are not allowed');
  }
}

export async function validateResolvedMcpServerUrl(url: string) {
  validateMcpServerUrl(url);
  if (process.env.NODE_ENV !== 'production') return;

  const hostname = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isPrivateAddress(hostname)) {
    throw new Error('Private, local, and link-local MCP addresses are not allowed');
  }

  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('MCP hostname resolves to a private, local, or link-local address');
  }
}
