import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata = {
  title: 'Market Intelligence Suite',
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
    title: 'Market Intelligence',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
