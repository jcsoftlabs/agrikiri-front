import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: {
    default: 'AGRIKIRI — De nos champs haïtiens à votre table',
    template: '%s | AGRIKIRI',
  },
  description:
    'AGRIKIRI est la première plateforme e-commerce de produits locaux haïtiens avec un réseau MLM intégré. Achetez du riz local, rejoignez notre réseau et gagnez des commissions.',
  keywords: ['Haïti', 'agriculture', 'riz local', 'produits locaux', 'MLM', 'commerce haïtien'],
  openGraph: {
    title: 'AGRIKIRI — De nos champs haïtiens à votre table',
    description: 'Plateforme e-commerce de produits locaux haïtiens + réseau MLM',
    locale: 'fr_HT',
    type: 'website',
  },
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
