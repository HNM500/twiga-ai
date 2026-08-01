import './globals.css';
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Baumans, Geist, Instrument_Serif } from 'next/font/google';
import { GeistPixelSquare, GeistPixelGrid } from 'geist/font/pixel';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sileo-toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import { NewChatHotkey } from '@/components/new-chat-hotkey';
import { ClientAnalytics } from '@/components/client-analytics';
import { HapticsProvider } from '@/components/haptics-provider';

import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://twiga.ai'),
  title: {
    default: 'Twiga AI - Built for Tanzania',
    template: '%s | Twiga AI',
  },
  description: 'A Tanzanian AI chat companion with cited web search and trusted local knowledge.',
  openGraph: {
    url: 'https://twiga.ai',
    siteName: 'Twiga AI',
  },
  keywords: ['Twiga AI', 'Tanzania AI', 'AI chat', 'web search', 'cited search'],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F5EE' },
    { media: '(prefers-color-scheme: dark)', color: '#0D2A3A' },
  ],
};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  preload: true,
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const baumans = Baumans({
  subsets: ['latin'],
  variable: '--font-baumans',
  preload: true,
  display: 'swap',
  weight: ['400'],
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  preload: true,
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${beVietnamPro.variable} ${baumans.variable} ${instrumentSerif.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NuqsAdapter>
          <Providers>
            <SidebarProvider>
              <Toaster position="top-center" />
              <HapticsProvider />
              <NewChatHotkey />
              {children}
            </SidebarProvider>
          </Providers>
        </NuqsAdapter>
        {process.env.VERCEL === '1' ? <ClientAnalytics /> : null}
      </body>
    </html>
  );
}
