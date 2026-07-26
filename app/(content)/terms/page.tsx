import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';

import { SciraLogo } from '@/components/logos/scira-logo';
import { SOURCE_URL, SUPPORT_EMAIL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply when you use the Twiga AI chat and cited-search service.',
  alternates: { canonical: 'https://twiga.ai/terms' },
};

const sections = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'service', label: 'Service' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'conduct', label: 'Acceptable use' },
  { id: 'content', label: 'Content and AI' },
  { id: 'third-party', label: 'Third parties' },
  { id: 'availability', label: 'Availability' },
  { id: 'liability', label: 'Liability' },
  { id: 'law', label: 'Law and contact' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <SciraLogo className="size-5" />
            <span className="font-be-vietnam-pro text-lg font-light tracking-tighter">Twiga AI</span>
          </Link>
          <Link href="/about" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-14 px-6 py-16 lg:grid-cols-[1fr_190px]">
        <main>
          <p className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80">Legal</p>
          <h1 className="mt-4 font-be-vietnam-pro text-4xl font-light tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Effective 26 July 2026</p>

          <div className="mt-9 rounded-2xl border border-primary/15 bg-primary/3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-primary" /> Current MVP terms
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Twiga currently provides guest AI chat and cited web search. There are no paid subscriptions, business
              claims, verification products or payment services in the current MVP.
            </p>
          </div>

          <div className="prose prose-neutral mt-12 max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-be-vietnam-pro prose-headings:font-light prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-foreground">
            <h2 id="agreement">1. Agreement</h2>
            <p>
              These terms govern your use of Twiga AI at twiga.ai. By using the service, you agree to these terms and
              our <Link href="/privacy-policy">Privacy Policy</Link>. If you use Twiga on behalf of an organisation, you
              confirm that you have authority to bind that organisation.
            </p>

            <h2 id="service">2. The service</h2>
            <p>
              Twiga is an AI chat companion with cited web search. It uses third-party AI and search services to process
              requests. Features may be experimental, may change without notice and may not always be available. The
              trusted Tanzanian business directory, paid verification, payments and other planned products are not part
              of the current service unless we clearly launch them under updated terms.
            </p>

            <h2 id="accounts">3. Guest use and accounts</h2>
            <p>
              Guest access is subject to usage and abuse limits. Account features may be enabled later. You are
              responsible for information submitted through your session and for keeping account credentials secure.
              Notify us promptly if you believe your account or session has been compromised.
            </p>

            <h2 id="conduct">4. Acceptable use</h2>
            <p>You must not use Twiga to:</p>
            <ul>
              <li>break the law, violate another person&apos;s rights or facilitate harm;</li>
              <li>submit material you do not have the right to process;</li>
              <li>generate or distribute malware, spam, fraud, abuse or deceptive impersonation;</li>
              <li>bypass security controls, rate limits or access restrictions;</li>
              <li>probe, disrupt or overload the service or its providers; or</li>
              <li>misrepresent AI output as verified professional, governmental or human advice.</li>
            </ul>
            <p>We may limit or suspend access that creates security, legal, provider or operational risk.</p>

            <h2 id="content">5. Your content and AI output</h2>
            <p>
              You retain any rights you have in content you submit. You grant Twiga the limited permission needed to
              process that content, operate the service, prevent abuse and comply with law. Do not submit confidential,
              sensitive or regulated information unless you are authorised and accept that it will be processed by the
              providers described in our Privacy Policy.
            </p>
            <p>
              AI output can be incomplete, outdated, biased or wrong. Citations can be misinterpreted and linked sites
              can change. You must verify important information independently, especially before medical, legal,
              financial, safety, employment or government decisions. Twiga does not provide professional advice.
            </p>

            <h2 id="third-party">6. Third-party services and intellectual property</h2>
            <p>
              Search results and links belong to their respective publishers. Your use of linked sites and third-party
              providers may be governed by their own terms. Twiga does not control or endorse every result returned by
              the service.
            </p>
            <p>
              The Twiga name, presentation and original product material are protected by applicable law. The web
              application is derived from Scira and is made available under the GNU Affero General Public License v3.0.
              The exact deployed source revision is available at{' '}
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                our public source repository
              </a>
              . Open-source dependencies remain subject to their respective licences.
            </p>

            <h2 id="availability">7. Availability, changes and charges</h2>
            <p>
              We may change models, providers, limits or features; perform maintenance; or discontinue a feature. We do
              not guarantee uninterrupted access or permanent storage of chats. Keep your own copy of anything
              important. The current MVP has no paid Twiga plan. Any future paid service will identify its price,
              renewal, cancellation and refund rules before purchase.
            </p>

            <h2 id="liability">8. Disclaimers and liability</h2>
            <p>
              To the extent permitted by law, Twiga is provided “as is” and “as available”, without warranties of
              accuracy, fitness for a particular purpose or uninterrupted operation. Twiga and its operator will not be
              liable for indirect, incidental, special or consequential loss arising from use of or inability to use the
              service. Nothing in these terms excludes liability that cannot lawfully be excluded or limits rights you
              have under mandatory consumer law.
            </p>

            <h2 id="law">9. Governing law, changes and contact</h2>
            <p>
              These terms are governed by the laws of the United Republic of Tanzania. Courts with lawful jurisdiction
              in Tanzania may hear disputes, without limiting any mandatory right you have to use another forum. We may
              update these terms as Twiga changes; the effective date above shows the current version.
            </p>
            <p>
              Questions about these terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div className="mt-14 flex flex-wrap gap-5 border-t border-border/50 pt-7 text-sm">
            <Link href="/privacy-policy" className="inline-flex items-center gap-1 hover:underline">
              Privacy Policy <ArrowUpRight className="size-3" />
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
