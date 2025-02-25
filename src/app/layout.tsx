import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';

export const metadata = {
  title: 'Market Intelligence Suite',
  description: 'Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis',
  icons: {
    icon: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/icon.svg`,
        type: 'image/svg+xml',
      }
    ],
    shortcut: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/icon.svg`,
        type: 'image/svg+xml',
      }
    ],
    apple: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/apple-icon.png`,
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
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1.0',
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
