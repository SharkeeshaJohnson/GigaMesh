import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Sprouts - The reality of the life you choose.',
  description:
    'A hyper-personalized life simulation sandbox game with AI-driven NPCs and emergent storytelling.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-japandi-cream text-japandi-brown-800`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
