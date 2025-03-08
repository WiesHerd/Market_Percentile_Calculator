import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';
import type { Metadata } from 'next';

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://wiesherd.github.io/Market_Percentile_Calculator'
    : 'http://localhost:3000'),
  title: {
    template: '%s | Market Intelligence • Analytics Suite',
    default: 'Market Intelligence • Analytics Suite'
  },
  description: 'Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis',
  icons: {
    icon: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/favicon.ico`,
        sizes: 'any',
      },
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/icon.svg`,
        type: 'image/svg+xml',
      }
    ],
    shortcut: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/favicon.ico`,
        sizes: 'any',
      }
    ],
    apple: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
      }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/safari-pinned-tab.svg`,
        color: '#2563eb'
      }
    ]
  },
  manifest: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Market Intelligence • Analytics Suite',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Market Intelligence • Analytics Suite</title>
      </head>
      <body suppressHydrationWarning={true}>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
