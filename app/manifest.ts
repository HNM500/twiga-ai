import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Twiga AI - Your Tanzanian AI Companion',
    short_name: 'Twiga AI',
    description: 'A Tanzanian AI companion for direct answers and cited web search.',
    start_url: '/',
    display: 'standalone',
    categories: ['search', 'ai', 'productivity'],
    background_color: '#FAF7F0',
    theme_color: '#102A3A',
    icons: [
      {
        src: '/icon-maskable.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/opengraph-image.png',
        type: 'image/png',
        sizes: '1200x630',
      },
    ],
  };
}
