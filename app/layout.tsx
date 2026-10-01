import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Holiday Camp Certificate Manager',
  description: 'Internal self-service recap and bulk certificate generator for branch admins.',
  openGraph: {
    title: 'Holiday Camp Certificate Manager',
    description: 'Internal self-service recap and bulk certificate generator for branch admins.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Holiday Camp Certificate Manager',
    description: 'Internal self-service recap and bulk certificate generator for branch admins.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
