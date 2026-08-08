import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Better Books - UAE VAT Compliance & ERP',
  description: 'UAE VAT Return Filing, Invoicing, Customer Management, and Compliance ERP',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
