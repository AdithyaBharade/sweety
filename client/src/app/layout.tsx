import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import NavBar from '@/components/NavBar';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Sweety – Blood Glucose Tracker',
  description: 'Record up to 4 blood glucose readings a day and see daily and monthly reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Grammarly, QuillBot) add attributes to
    // <html>/<body> before React loads. This only ignores attribute differences on these two
    // tags, so real hydration bugs inside the app are still reported.
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-muted/40 antialiased" suppressHydrationWarning>
        <AuthProvider>
          <NavBar />
          {children}
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
