import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ShoppingBag, User } from 'lucide-react';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kerala Ayurvedh | Authentic Ayurveda',
  description: 'Premium Ayurvedic solutions.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-48x48.png', type: 'image/png', sizes: '48x48' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      {
        rel: 'shortcut icon',
        url: '/icon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
    ],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 transition-colors duration-300">
        <div className="min-h-screen flex flex-col bg-white text-gray-900">
          <div className="bg-brand-900 text-center py-2 text-xs font-medium text-white tracking-wider border-b border-brand-800">
            FREE SHIPPING ON ALL ORDERS
          </div>

          <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center md:hidden">
                  <button className="text-gray-600 hover:text-brand-500" aria-label="Open menu">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 flex justify-center md:justify-start">
                  <Link href="/" className="flex items-center space-x-2 group">
                    <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded overflow-hidden">
                      <Image src="/logo.png" alt="Kerala Ayurvedh Logo" fill className="object-contain" />
                    </div>
                    <div className="flex flex-col leading-none pt-1">
                      <span className="font-extrabold text-xl tracking-tighter text-brand-600 uppercase transition-colors">KERALA</span>
                      <span className="text-[11px] text-brand-600 uppercase tracking-[0.2em] font-bold transition-colors mt-0.5">AYURVEDH</span>
                    </div>
                  </Link>
                </div>

                <div className="hidden md:flex space-x-8 items-center flex-1 justify-center">
                  <Link href="/#download-app" className="text-sm font-semibold text-brand-600 hover:text-brand-500 transition-colors flex items-center">
                    <User className="w-4 h-4 mr-1" /> PARTNER LOGIN
                  </Link>
                </div>

                <div className="flex items-center space-x-4 md:space-x-6 justify-end flex-1">
                  <Link href="/#download-app" className="text-gray-600 hover:text-brand-500 transition-colors" aria-label="Search products in app">
                    <Search className="w-5 h-5" />
                  </Link>
                  <Link href="/#download-app" className="text-gray-600 hover:text-brand-500 relative transition-colors" aria-label="Open cart in app">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          <main className="flex-grow flex flex-col">{children}</main>

          <footer className="bg-brand-50 border-t border-brand-200 pt-8 pb-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex justify-center text-xs text-gray-500">
              <p>Copyright &copy; 2026 Kerala Ayurvedh | All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
