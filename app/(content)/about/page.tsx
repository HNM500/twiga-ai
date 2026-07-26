import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Search, ShieldCheck } from 'lucide-react';

import { SciraLogo } from '@/components/logos/scira-logo';
import { Button } from '@/components/ui/button';
import { SOURCE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About',
  description: 'Twiga AI is an AI companion built for Tanzania, combining clear conversation with cited web search.',
  alternates: {
    canonical: 'https://twiga.ai/about',
  },
};

const principles = [
  {
    icon: Search,
    title: 'Useful from day one',
    description: 'Start with a fast AI companion and cited web search that helps people verify what they read.',
  },
  {
    icon: Building2,
    title: 'Local knowledge compounds',
    description: 'Build a trusted Tanzanian business directory that becomes more accurate and useful over time.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust is a product feature',
    description: 'Show sources, separate claims from verification, and never disguise paid placement as an answer.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <SciraLogo className="size-6" />
            <span className="font-be-vietnam-pro text-xl font-light tracking-tighter">Twiga AI</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 pixel-grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
            <p className="mb-5 font-pixel text-[10px] uppercase tracking-[0.22em] text-primary/80">twiga.ai</p>
            <h1 className="max-w-3xl font-be-vietnam-pro text-5xl font-light leading-[1.05] tracking-tight sm:text-7xl">
              An AI companion built for Tanzania.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Twiga AI begins with simple conversation and cited web search. Its first local advantage will be helping
              people find, evaluate, and contact trusted Tanzanian businesses.
            </p>
            <Button asChild className="mt-9 rounded-full px-6">
              <Link href="/">
                Try Twiga AI <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid gap-5 md:grid-cols-3">
            {principles.map((principle) => (
              <article key={principle.title} className="rounded-2xl border border-border/50 bg-card/30 p-6">
                <principle.icon className="size-5 text-primary/80" />
                <h2 className="mt-5 font-be-vietnam-pro text-xl font-medium tracking-tight">{principle.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{principle.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-16 max-w-2xl border-l-2 border-primary/30 pl-6">
            <h2 className="font-be-vietnam-pro text-2xl font-light tracking-tight">Where we are now</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The current MVP supports guest chat and live cited search. Authentication, the trusted business finder,
              verified listings, local payments, and deeper Tanzanian datasets will be introduced progressively as each
              layer is ready.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Twiga AI</span>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <a href="mailto:support@twiga.ai" className="hover:text-foreground">
              support@twiga.ai
            </a>
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Source code
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
