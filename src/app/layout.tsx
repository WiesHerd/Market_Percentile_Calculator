import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';

export const metadata = {
  title: 'Market Intelligence Suite',
  description: 'Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any'
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml'
      }
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180'
    }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
