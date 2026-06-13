'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

const navLinks = [
  { label: 'Boutique',     href: '/shop',     icon: '🛍' },
  { label: 'Notre réseau', href: '/#ayizan',  icon: '🌱' },
  { label: 'À propos',     href: '/about',    icon: '✦' },
];

// ─── Colours ──────────────────────────────────────────────
const C = {
  // scrolled (white) bar
  bg:           '#FFFFFF',
  border:       '#e8e8e0',
  linkText:     '#374151',
  linkActive:   '#1a5c1a',
  linkHoverBg:  '#f0f7f0',
  cartText:     '#374151',
  loginText:    '#374151',
  btnBg:        '#1a5c1a',
  btnText:      '#FFFFFF',
  dashBg:       '#1a5c1a',
  dashText:     '#FFFFFF',
  // transparent (over light hero) bar — dark green text
  tLinkText:     '#2d5a2d',
  tLinkActive:   '#1a5c1a',
  tCartText:     '#2d5a2d',
  tLoginText:    '#2d5a2d',
  tBtnBg:        'rgba(26,92,26,0.08)',
  tBtnText:      '#1a5c1a',
  tBtnBorder:    'rgba(26,92,26,0.25)',
  tDashBg:       'rgba(26,92,26,0.1)',
  tDashBorder:   'rgba(26,92,26,0.2)',
  tDashText:     '#1a5c1a',
  gold:          '#2d7a2d',
};

export default function Navbar() {
  const pathname           = usePathname();
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);

  const items        = useCartStore((s) => s.items);
  const hasHydrated  = useCartStore((s) => s.hasHydrated);
  const user         = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const isPublicPage =
    pathname === '/' || pathname === '/shop' || pathname === '/about' || pathname.startsWith('/shop/');
  const dark = isPublicPage && !scrolled;   // true → transparent over hero

  const dashboardHref =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'CASHIER'
        ? '/admin/pos'
      : user?.role === 'ACCOUNTANT'
        ? '/admin/accounting'
      : user?.role === 'STOCK_MANAGER'
        ? '/stock'
      : user?.role === 'BUYER'
        ? '/buyer'
        : user?.role === 'DELIVERY_AGENT'
          ? '/delivery'
          : user?.role === 'ASSOCIATE'
            ? '/board'
            : '/dashboard';
  const dashboardLabel =
    user?.role === 'ADMIN'
      ? 'Admin'
      : user?.role === 'CASHIER'
        ? 'POS'
      : user?.role === 'ACCOUNTANT'
        ? 'Compta'
      : user?.role === 'STOCK_MANAGER'
        ? 'Stock'
      : user?.role === 'BUYER'
        ? 'Achats terrain'
        : user?.role === 'DELIVERY_AGENT'
          ? 'Livraisons'
          : user?.role === 'ASSOCIATE'
            ? 'Associés'
            : 'Mon compte';
  const cartCount      = items.reduce((s, i) => s + i.quantity, 0);
  const cartCountLabel = cartCount > 99 ? '99+' : cartCount;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* ── helpers ─────────────────────────────────────── */
  const linkColor = (active: boolean) =>
    dark
      ? active ? C.tLinkActive : C.tLinkText
      : active ? C.linkActive  : C.linkText;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={
        dark
          ? {
              background: 'rgba(240,249,235,0.7)',
              borderBottom: '1px solid rgba(26,92,26,0.08)',
              backdropFilter: 'blur(12px)',
            }
          : {
              background: C.bg,
              borderBottom: `1px solid ${C.border}`,
              boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
              backdropFilter: 'blur(12px)',
            }
      }
    >
      <div className="container-agri">
        <nav className="flex items-center justify-between h-16 md:h-20">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 transition-transform duration-300 hover:scale-105">
            <div className="relative h-10 w-36 md:h-12 md:w-44">
              <Image src="/images/logo.png" alt="AGRIKIRI" fill className="object-contain object-left" priority />
            </div>
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest"
              style={
                dark
                  ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }
                  : { background: 'rgba(214,40,40,0.08)',   color: '#c0392b',               border: '1px solid rgba(214,40,40,0.15)' }
              }
            >
              🇭🇹
            </span>
          </Link>

          {/* ── Desktop Nav links ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active =
                (link.href === '/shop' && pathname.startsWith('/shop')) ||
                (link.href === '/#ayizan' && pathname === '/') ||
                pathname === link.href ||
                (link.href !== '/' && !link.href.includes('#') && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group"
                  style={{
                    color: linkColor(active),
                    background: !dark && !active ? 'transparent' : undefined,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {link.label}
                  {/* Gold underline indicator */}
                  <span
                    className="absolute bottom-0 left-4 right-4 h-px rounded-full origin-left transition-all duration-300"
                    style={{
                      background: `linear-gradient(90deg, ${C.gold}, #FCD34D)`,
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      opacity: active ? 1 : 0,
                    }}
                  />
                </Link>
              );
            })}
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
              style={{ color: dark ? C.tCartText : C.cartText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Panier
              {mounted && hasHydrated && cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: C.gold, color: '#060a14' }}
                >
                  {cartCountLabel}
                </span>
              )}
            </Link>

            {/* Auth buttons */}
            {isAuthenticated && user ? (
              <Link href={dashboardHref}>
                <button
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-95"
                  style={
                    dark
                      ? { background: C.tDashBg, color: C.tDashText, border: `1px solid ${C.tDashBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }
                      : { background: C.dashBg,  color: C.dashText,  fontFamily: "'Plus Jakarta Sans', sans-serif" }
                  }
                >
                  {dashboardLabel}
                </button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200"
                  style={{ color: dark ? C.tLoginText : C.loginText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Connexion
                </Link>
                <Link href="/register">
                  <button
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-95"
                    style={
                      dark
                        ? { background: C.tBtnBg, color: C.tBtnText, border: `1px solid ${C.tBtnBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }
                        : { background: C.btnBg,  color: C.btnText,  fontFamily: "'Plus Jakarta Sans', sans-serif" }
                    }
                  >
                    Créer un compte
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile icons ── */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200"
              style={
                dark
                  ? {
                      color: '#1a5c1a',
                      background: 'rgba(255,255,255,0.82)',
                      border: '1px solid rgba(26,92,26,0.14)',
                      boxShadow: '0 6px 18px rgba(26,92,26,0.08)',
                    }
                  : {
                      color: '#374151',
                      background: '#FFFFFF',
                      border: '1px solid rgba(17,24,39,0.08)',
                    }
              }
              aria-label="Panier"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {mounted && hasHydrated && cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: C.gold, color: '#060a14' }}
                >
                  {cartCountLabel}
                </span>
              )}
            </Link>

            <button
              className="w-11 h-11 rounded-xl transition-all duration-200 flex items-center justify-center"
              style={
                dark
                  ? {
                      color: '#1a5c1a',
                      background: 'rgba(255,255,255,0.82)',
                      border: '1px solid rgba(26,92,26,0.14)',
                      boxShadow: '0 6px 18px rgba(26,92,26,0.08)',
                    }
                  : {
                      color: '#374151',
                      background: '#FFFFFF',
                      border: '1px solid rgba(17,24,39,0.08)',
                    }
              }
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 w-0' : ''}`} />
                <span className={`block h-0.5 bg-current rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </div>
            </button>
          </div>
        </nav>

        {/* ── Mobile Menu ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-400 ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div
            className="mb-4 p-4 rounded-2xl"
            style={{
              background: dark ? 'rgba(11,18,37,0.97)' : '#FFFFFF',
              backdropFilter: 'blur(24px)',
              border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            {navLinks.map((link) => {
              const active =
                (link.href === '/shop' && pathname.startsWith('/shop')) ||
                (link.href === '/#ayizan' && pathname === '/') ||
                pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: dark
                      ? (active ? C.gold : 'rgba(248,244,238,0.75)')
                      : (active ? C.linkActive : C.linkText),
                    background: active
                      ? (dark ? 'rgba(245,158,11,0.08)' : 'rgba(26,92,26,0.06)')
                      : 'transparent',
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: dark ? C.gold : C.linkActive }} />
                  )}
                </Link>
              );
            })}

            <div
              className="border-t mt-3 pt-3 flex flex-col gap-2"
              style={{ borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e8e8e0' }}
            >
              {isAuthenticated && user ? (
                <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
                  <button
                    className="w-full py-3 rounded-xl font-semibold text-sm"
                    style={{ background: C.dashBg, color: C.dashText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {dashboardLabel}
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <button
                      className="w-full py-3 rounded-xl font-medium text-sm"
                      style={{
                        background: dark ? 'rgba(255,255,255,0.05)' : '#f5f5f0',
                        color: dark ? 'rgba(248,244,238,0.75)' : '#374151',
                        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0d8',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      Connexion
                    </button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-sm"
                      style={{ background: C.btnBg, color: C.btnText, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Créer un compte
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
