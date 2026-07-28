import 'server-only';

import { serverEnv } from '@/env/server';

type AuthEmailKind = 'verification' | 'password-reset';

interface AuthEmailInput {
  kind: AuthEmailKind;
  to: string;
  name?: string | null;
  url: string;
}

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assertTrustedAuthUrl(value: string) {
  const url = new URL(value);
  const allowedOrigins = new Set(
    [serverEnv.BETTER_AUTH_BASE_URL, ...(serverEnv.ALLOWED_ORIGINS || '').split(',')]
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => new URL(origin).origin),
  );

  if (!allowedOrigins.has(url.origin)) {
    throw new Error('Refusing to send an authentication email with an untrusted link origin.');
  }

  return url.toString();
}

export function isAuthEmailConfigured() {
  return Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM);
}

export function buildAuthEmail({ kind, name, url }: Omit<AuthEmailInput, 'to'>) {
  const safeUrl = escapeHtml(assertTrustedAuthUrl(url));
  const safeName = escapeHtml(name?.trim() || 'there');
  const isVerification = kind === 'verification';
  const subject = isVerification ? 'Verify your Twiga email' : 'Reset your Twiga password';
  const heading = isVerification ? 'Verify your email' : 'Reset your password';
  const action = isVerification ? 'Verify email' : 'Reset password';
  const explanation = isVerification
    ? 'Confirm this email address to finish setting up your Twiga account.'
    : 'Use this secure link to choose a new password. If you did not request this, you can ignore this email.';

  return {
    subject,
    text: `Hello ${name?.trim() || 'there'},\n\n${explanation}\n\n${url}\n\nThis link is intended only for you.`,
    html: `<!doctype html><html><body style="margin:0;background:#faf7f0;color:#0d2a3a;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:40px 24px"><p style="font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Twiga</p><h1 style="font-size:28px;font-weight:500;margin:28px 0 12px">${heading}</h1><p style="font-size:16px;line-height:1.6">Hello ${safeName},</p><p style="font-size:16px;line-height:1.6">${explanation}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#0d2a3a;color:#fff;padding:13px 18px;text-decoration:none;font-weight:600">${action}</a></p><p style="font-size:13px;line-height:1.5;color:#5f6f77">This link is intended only for you. If the button does not work, copy and paste this address into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p></div></body></html>`,
  };
}

export async function sendAuthEmail(input: AuthEmailInput) {
  if (!isAuthEmailConfigured()) {
    throw new Error('Authentication email delivery is not configured.');
  }

  const content = buildAuthEmail(input);
  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM,
      to: [input.to],
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Authentication email delivery failed with status ${response.status}.`);
  }
}

export function queueAuthEmail(input: AuthEmailInput) {
  if (!isAuthEmailConfigured()) {
    throw new Error('Authentication email delivery is not configured.');
  }

  void sendAuthEmail(input).catch(() => {
    console.error('[auth-email] Delivery failed.');
  });
}
