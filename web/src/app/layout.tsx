import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Search, ShoppingBag, MessageCircle, User } from 'lucide-react';
import Image from 'next/image';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kerala Ayurvedh | Authentic Ayurveda',
  description: 'Premium Ayurvedic solutions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white text-gray-900 transition-colors duration-300`}>
        <div className="min-h-screen flex flex-col bg-white text-gray-900">
            {/* Top Banner */}
            <div className="bg-brand-900 text-center py-2 text-xs font-medium text-white tracking-wider border-b border-brand-800">
              FREE SHIPPING ON ALL ORDERS
            </div>
            
            {/* Main Navigation */}
            <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 transition-colors duration-300">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  
                  {/* Hamburger Menu (Mobile Placeholder) */}
                  <div className="flex items-center md:hidden">
                    <button className="text-gray-600 hover:text-brand-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                  </div>

                  {/* Logo */}
                  <div className="flex-1 flex justify-center md:justify-start">
                    <a href="/" className="flex items-center space-x-2 group">
                      <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded overflow-hidden">
                        <Image src="/logo.png" alt="Kerala Ayurvedh Logo" fill className="object-contain" />
                      </div>
                      <div className="flex flex-col leading-none pt-1">
                        <span className="font-extrabold text-xl tracking-tighter text-brand-600 uppercase transition-colors">KERALA</span>
                        <span className="text-[11px] text-brand-600 uppercase tracking-[0.2em] font-bold transition-colors mt-0.5">AYURVEDH</span>
                      </div>
                    </a>
                  </div>

                  {/* Desktop Links */}
                  <div className="hidden md:flex space-x-8 items-center flex-1 justify-center">
                    <a href="/#download-app" className="text-sm font-semibold text-brand-600 hover:text-brand-500 transition-colors flex items-center">
                      <User className="w-4 h-4 mr-1" /> PARTNER LOGIN
                    </a>
                  </div>

                  {/* Icons */}
                  <div className="flex items-center space-x-4 md:space-x-6 justify-end flex-1">
                    <button className="text-gray-600 hover:text-brand-500 transition-colors">
                      <Search className="w-5 h-5" />
                    </button>
                    <button className="text-gray-600 hover:text-brand-500 relative transition-colors">
                      <ShoppingBag className="w-5 h-5" />
                      <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>
                    </button>
                  </div>
                </div>
              </div>
            </nav>

            <main className="flex-grow flex flex-col">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-brand-50 border-t border-brand-200 pt-8 pb-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
              <div className="max-w-7xl mx-auto flex justify-center text-xs text-gray-500">
                <p>Copyright © 2026 Kerala Ayurvedh | All rights reserved.</p>
              </div>
            </footer>
          </div>
      </body>
    </html>
  );
}
