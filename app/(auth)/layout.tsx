import Link from 'next/link';
import { Search, ShieldCheck, MapPin } from 'lucide-react';

import { SciraLogo } from '@/components/logos/scira-logo';

const features = [
  {
    icon: Search,
    label: 'Cited web search',
    description: 'Current answers with links you can verify.',
  },
  {
    icon: MapPin,
    label: 'Built for Tanzania',
    description: 'Local knowledge and business discovery are the priority.',
  },
  {
    icon: ShieldCheck,
    label: 'Trust first',
    description: 'Clear sources, transparent limits, and verified local data.',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <aside className="relative hidden overflow-hidden border-r border-border/50 lg:flex lg:w-[45%] xl:w-1/2">
        <div className="absolute inset-0 pixel-grid-bg opacity-30" />
        <div className="absolute inset-0 bg-linear-to-br from-background via-background to-muted/30" />

        <div className="relative flex w-full flex-col justify-between px-12 py-10 xl:px-20">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <SciraLogo className="size-9" />
            <span className="font-be-vietnam-pro text-3xl font-light tracking-tighter">Twiga AI</span>
          </Link>

          <div className="max-w-md">
            <p className="mb-4 font-pixel text-[10px] uppercase tracking-[0.22em] text-primary/80">
              Built for Tanzania
            </p>
            <h1 className="font-be-vietnam-pro text-4xl font-light leading-tight tracking-tight xl:text-5xl">
              Ask clearly. Search widely. Verify every answer.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Twiga AI combines straightforward conversation with cited web search, and will grow into a trusted layer
              for Tanzanian knowledge and business discovery.
            </p>

            <div className="mt-10 space-y-3">
              {features.map((feature) => (
                <div key={feature.label} className="flex gap-3 rounded-xl border border-border/40 bg-card/30 p-4">
                  <feature.icon className="mt-0.5 size-4 shrink-0 text-primary/80" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">twiga.ai</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-background lg:w-[55%] xl:w-1/2">
        <header className="flex h-16 items-center border-b border-border/50 px-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <SciraLogo className="size-6" />
            <span className="font-be-vietnam-pro text-2xl font-light tracking-tighter">Twiga AI</span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12">{children}</div>

        <footer className="flex h-12 items-center justify-center gap-6 px-6 text-xs text-muted-foreground">
          <span>twiga.ai</span>
          <span className="h-3 w-px bg-border/30" />
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </footer>
      </main>
    </div>
  );
}
