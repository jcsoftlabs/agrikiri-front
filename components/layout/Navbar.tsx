'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

const navLinks = [
  { label: 'Boutique', href: '/shop' },
  { label: 'Notre réseau', href: '/register' },
  { label: 'À propos', href: '/about' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHomePage = pathname === '/';
  const useTransparentStyle = isHomePage && !scrolled;
  const dashboardHref = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
  const dashboardLabel = user?.role === 'ADMIN' ? 'Admin' : 'Mon compte';

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountLabel = cartCount > 99 ? '99+' : cartCount;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        useTransparentStyle ? 'bg-transparent' : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
      }`}
    >
      <div className="container-agri">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <div className="relative h-10 w-36 md:h-12 md:w-44">
              <Image 
                src="/images/logo.png" 
                alt="AGRIKIRI" 
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  useTransparentStyle
                    ? 'text-white/90 hover:text-white hover:bg-white/10'
                    : 'text-gray-700 hover:text-agri-green-600 hover:bg-agri-green-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/cart"
              className={`relative text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                useTransparentStyle
                  ? 'text-white/90 hover:text-white hover:bg-white/10'
                  : 'text-gray-700 hover:text-agri-green-600 hover:bg-agri-green-50'
              }`}
            >
              🛒 Panier
              {hasHydrated && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-agri-gold-400 text-agri-dark text-[11px] font-bold flex items-center justify-center">
                  {cartCountLabel}
                </span>
              )}
            </Link>
            {isAuthenticated && user ? (
              <Link href={dashboardHref}>
                <Button size="sm" variant="primary">
                  {dashboardLabel}
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                    useTransparentStyle
                      ? 'text-white/90 hover:text-white'
                      : 'text-gray-700 hover:text-agri-green-600'
                  }`}
                >
                  Connexion
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="primary">
                    Créer un compte
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/cart"
              className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                useTransparentStyle
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-agri-green-50 hover:text-agri-green-600'
              }`}
              aria-label="Panier"
            >
              <span className="text-lg">🛒</span>
              {hasHydrated && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-agri-gold-400 text-agri-dark text-[10px] font-bold flex items-center justify-center">
                  {cartCountLabel}
                </span>
              )}
            </Link>

            <button
              className={`p-2 rounded-lg transition-colors ${
                useTransparentStyle ? 'text-white' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current transition-transform ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block h-0.5 bg-current transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-transform ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md rounded-2xl mb-4 p-4 shadow-lg border border-gray-100 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-agri-green-50 hover:text-agri-green-600 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/cart"
              className="block px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-agri-green-50 hover:text-agri-green-600 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Panier {hasHydrated && cartCount > 0 ? `(${cartCountLabel})` : ''}
            </Link>
            <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">{dashboardLabel}</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" size="sm" className="w-full">Connexion</Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">Créer un compte</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
