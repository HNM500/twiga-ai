import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Shield } from 'lucide-react';

import { TwigaLogo } from '@/components/logos/twiga-logo';
import { SOURCE_URL, SUPPORT_EMAIL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Twiga AI handles information when you use its chat and cited-search service.',
  alternates: { canonical: 'https://twiga.ai/privacy-policy' },
};

const sections = [
  { id: 'scope', label: 'Scope' },
  { id: 'data', label: 'Data we handle' },
  { id: 'use', label: 'How we use it' },
  { id: 'providers', label: 'Service providers' },
  { id: 'retention', label: 'Retention' },
  { id: 'choices', label: 'Your choices' },
  { id: 'security', label: 'Security' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <TwigaLogo className="h-5 w-auto" />
          </Link>
          <Link href="/about" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-14 px-6 py-16 lg:grid-cols-[1fr_190px]">
        <main>
          <p className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80">Legal</p>
          <h1 className="mt-4 font-be-vietnam-pro text-4xl font-light tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Effective 26 July 2026</p>

          <div className="mt-9 rounded-2xl border border-primary/15 bg-primary/3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="size-4 text-primary" /> The short version
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Twiga processes what you submit so it can answer you and search the web. We do not sell personal data or
              run behavioural advertising. The MVP is hosted outside Tanzania, so data residency in Tanzania is not a
              current feature.
            </p>
          </div>

          <div className="prose prose-neutral mt-12 max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-be-vietnam-pro prose-headings:font-light prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-foreground">
            <h2 id="scope">1. Scope and responsibility</h2>
            <p>
              This notice applies to the Twiga AI website, chat companion and cited web-search experience at twiga.ai.
              “Twiga”, “we” and “us” mean the operator of Twiga AI. We are responsible for deciding how information is
              used within the Twiga service. This notice does not cover websites you open from search results.
            </p>

            <h2 id="data">2. Information we handle</h2>
            <ul>
              <li>
                <strong>Conversation content:</strong> prompts, search requests, files and other content you choose to
                submit, together with generated answers and cited sources.
              </li>
              <li>
                <strong>Account and session data:</strong> if you create an account, your name, email address, profile
                image, authentication account, session records and saved chat history. Passwords are stored only as
                one-way password hashes and cannot be viewed by Twiga administrators. Google OAuth is not yet enabled.
                Guest chat does not create a saved Twiga chat history.
              </li>
              <li>
                <strong>Technical and security data:</strong> IP-derived rate-limit identifiers, browser and device
                information sent with web requests, cookies needed for sessions and preferences, timestamps and abuse
                signals.
              </li>
              <li>
                <strong>Operational data:</strong> request outcome, duration, model, token counts, model cost, tools
                used and error diagnostics. Twiga&apos;s structured operational events are designed not to include full
                prompt bodies.
              </li>
              <li>
                <strong>Answer feedback:</strong> whether an answer was helpful, any issue categories you select, an
                optional comment, and the answer, chat and search-mode identifiers needed to investigate it. Do not
                include passwords, account numbers or other sensitive information in a feedback comment.
              </li>
              <li>
                <strong>Twiga Apps data:</strong> if you enable a connected app, we store its server configuration and
                encrypted credentials or OAuth tokens. Requests sent through that app can include your prompt and the
                minimum context needed to carry out the request.
              </li>
            </ul>

            <h2 id="use">3. Why we use information</h2>
            <p>We use this information to:</p>
            <ul>
              <li>provide chat, web search, citations and saved history where available;</li>
              <li>authenticate users, preserve sessions and enforce usage limits;</li>
              <li>connect and operate user-selected Twiga Apps when that beta feature is enabled;</li>
              <li>secure, debug and monitor the service;</li>
              <li>review answer feedback and improve quality, citations and safety;</li>
              <li>measure reliability, model usage and operating cost; and</li>
              <li>comply with applicable law and respond to valid legal requests.</li>
            </ul>
            <p>We do not sell personal data and do not use it for behavioural advertising.</p>

            <h2 id="providers">4. Providers and international processing</h2>
            <p>The current MVP uses the following processors and infrastructure:</p>
            <ul>
              <li>
                <strong>Railway:</strong> hosts the application, PostgreSQL database, Redis and platform logs. The
                current deployment is in Railway&apos;s Singapore region, not Tanzania. See Railway&apos;s{' '}
                <a href="https://railway.com/legal/privacy" target="_blank" rel="noreferrer">
                  privacy notice
                </a>
                .
              </li>
              <li>
                <strong>OpenRouter:</strong> receives prompts and related context and routes them to an upstream AI
                provider. The MVP uses open-weight models through OpenRouter, and the serving provider may vary based on
                availability and routing. See{' '}
                <a href="https://openrouter.ai/privacy" target="_blank" rel="noreferrer">
                  OpenRouter&apos;s privacy policy
                </a>{' '}
                .
              </li>
              <li>
                <strong>Exa:</strong> receives generated web-search queries and returns sources used in cited answers.
                See{' '}
                <a href="https://exa.ai/privacy" target="_blank" rel="noreferrer">
                  Exa&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Resend:</strong> will deliver account verification and password-recovery emails when those
                features are enabled. Until email delivery is configured, Twiga does not send account emails.
              </li>
            </ul>
            <p>
              These services may process information outside Tanzania. We will update this notice before adding new
              production providers or enabling payments, business claims or directory ingestion involving personal data.
            </p>
            <p>
              Connected apps are independent third-party services chosen by the user. Their operators receive requests
              and data sent through their tools and apply their own privacy terms. Twiga Apps is disabled by default and
              should not be used with sensitive information unless you trust the app operator.
            </p>

            <h2 id="retention">5. Storage and retention</h2>
            <p>
              Signed-in chats, account records and sessions are stored in PostgreSQL. Redis holds short-lived rate-limit
              and stream state. Platform logs hold operational and error records. We retain information only while it is
              needed to provide and secure the service, meet legal obligations, resolve disputes or maintain necessary
              backups. Provider-side retention is also governed by each provider&apos;s policy.
            </p>
            <p>
              You can delete individual saved chats in the product. To request access, correction, account deletion or
              another privacy action, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We may need to
              verify your identity before acting on a request.
            </p>

            <h2 id="choices">6. Your choices and rights</h2>
            <p>
              Depending on applicable law, including Tanzania&apos;s Personal Data Protection Act, you may have rights
              to receive information about processing, access or correct personal data, object to or restrict certain
              processing, withdraw consent where consent is the basis, and request deletion. You may also contact the
              Personal Data Protection Commission of Tanzania.
            </p>

            <h2 id="security">7. Security and children</h2>
            <p>
              We use encrypted HTTPS connections, private Railway service networking, restricted production secrets,
              database-backed sessions and rate limiting. No internet service can guarantee absolute security. Twiga is
              not designed specifically for children; a parent or guardian should supervise use by anyone who cannot
              lawfully consent for themselves.
            </p>

            <h2 id="contact">8. Changes and contact</h2>
            <p>
              We may revise this notice as the product changes. Material changes will be reflected here with a new
              effective date. Questions and privacy requests can be sent to{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div className="mt-14 flex flex-wrap gap-5 border-t border-border/50 pt-7 text-sm">
            <Link href="/terms" className="inline-flex items-center gap-1 hover:underline">
              Terms of Service <ArrowUpRight className="size-3" />
            </Link>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Deployed source <ArrowUpRight className="size-3" />
            </a>
          </div>
        </main>

        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-2 text-xs text-muted-foreground">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block py-1 hover:text-foreground">
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
