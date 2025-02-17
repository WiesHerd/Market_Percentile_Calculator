import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';

export const metadata = {
  title: 'Market Intelligence Suite',
  description: 'Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis',
  icons: {
    icon: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/wh-icon.png`,
        type: 'image/png'
      }
    ],
    shortcut: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/wh-icon.png`,
        type: 'image/png'
      }
    ],
    apple: [
      {
        url: `${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/wh-icon.png`,
        type: 'image/png'
      }
    ]
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
