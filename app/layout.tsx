import type { Metadata, Viewport } from 'next';

import { fontVariables } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Antesala', template: '%s' },
  description: 'Explora el hotel antes de llegar.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f1ea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
