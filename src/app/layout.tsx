import type { Metadata } from 'next';
import './globals.css';
import ToastContainer from '@/components/Toast';

export const metadata: Metadata = {
  title: 'EliteBooking — Réservez vos soins beauté au Maroc',
  description: 'La plateforme de réservation beauté marocaine. Hammam, coiffure, spa, massage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
