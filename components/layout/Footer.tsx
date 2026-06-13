 'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const footerLinks = {
  Boutique: [
    { label: 'Tous les produits', href: '/shop' },
    { label: 'Mon panier',        href: '/cart' },
  ],
  Réseau: [
    { label: "S'inscrire",        href: '/register' },
    { label: 'Se connecter',      href: '/login' },
  ],
  Compte: [
    { label: 'Tableau de bord',   href: '/dashboard' },
    { label: 'Mes gains',         href: '/earnings' },
    { label: 'Mon réseau',        href: '/network' },
    { label: 'Mes commandes',     href: '/orders' },
    { label: 'Mon profil',        href: '/profile' },
  ],
};

const socials = [
  {
    label: 'Facebook', href: '#',
    svg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
  },
  {
    label: 'Instagram', href: '#',
    svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>',
  },
  {
    label: 'TikTok', href: '#',
    svg: '<path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>',
  },
  {
    label: 'YouTube', href: '#',
    svg: '<path d="M23.499 6.203a3.007 3.007 0 0 0-2.089-2.089c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.203a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.089 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.089-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>',
  },
];

const COMPANY_PHONE = '+509 2999-3636';
const COMPANY_EMAIL = 'info@agrikiri.com';

export default function Footer() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentYear = new Date().getFullYear();
  const showAccountLinks = mounted && isAuthenticated && !!user;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer
      style={{
        background: '#FFFFFF',
        borderTop: '2px solid #e8f0e0',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Top accent bar ── */}
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #2d7a2d 0%, #5aab3a 40%, #b8d94e 70%, #2d7a2d 100%)',
        }}
      />

      {/* ── Main content ── */}
      <div className="container-agri py-14 md:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-14">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="relative h-12 w-44 mb-5">
              <Image src="/images/logo.png" alt="AGRIKIRI Logo" fill className="object-contain object-left" />
            </div>

            <p className="text-sm leading-relaxed mb-5 max-w-xs" style={{ color: '#5a7060' }}>
              La première plateforme e-commerce de produits locaux haïtiens avec un système MLM intégré.
              De nos champs à votre table.
            </p>

            {/* Mission quote */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: '#f0f9eb', border: '1px solid rgba(45,122,45,0.15)' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#2d7a2d', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Notre mission
              </div>
              <p className="text-sm italic leading-relaxed" style={{ color: '#4a5a4a' }}>
                "Valoriser l'agriculture haïtienne en connectant producteurs et consommateurs avec un réseau de distribution local."
              </p>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 social-icon-btn"
                  style={{
                    background: '#f0f9eb',
                    color: '#5a7060',
                    border: '1px solid rgba(45,122,45,0.15)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" dangerouslySetInnerHTML={{ __html: s.svg }} />
                </a>
              ))}
            </div>

            <div
              className="mt-6 rounded-xl p-4"
              style={{ background: '#fffdf6', border: '1px solid rgba(26,92,26,0.12)' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#1a5c1a', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Contact
              </div>
              <div className="space-y-1.5 text-sm" style={{ color: '#5a7060' }}>
                <a href={`tel:${COMPANY_PHONE.replace(/[^\d+]/g, '')}`} className="block footer-link">
                  {COMPANY_PHONE}
                </a>
                <a href={`mailto:${COMPANY_EMAIL}`} className="block footer-link">
                  {COMPANY_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks)
            .filter(([category]) => category !== 'Compte' || showAccountLinks)
            .map(([category, links]) => (
            <div key={category}>
              <h4
                className="font-bold text-sm uppercase tracking-widest mb-5"
                style={{ color: '#1a5c1a', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-all duration-200 group flex items-center gap-1.5 footer-link"
                    >
                      <span
                        className="w-3 h-px transition-all duration-300 group-hover:w-5 flex-shrink-0"
                        style={{ background: 'rgba(45,122,45,0.4)' }}
                      />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* AYIZAN card */}
        <div
          className="mt-12 rounded-2xl p-6 grid md:grid-cols-3 gap-6 items-center"
          style={{ background: '#f5f9f0', border: '1.5px solid rgba(45,122,45,0.15)' }}
        >
          <div className="md:col-span-2">
            <div
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#2d7a2d', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              🌱 Programme AYIZAN
            </div>
            <h3
              className="text-lg font-bold mb-1"
              style={{ fontFamily: "'Playfair Display', serif", color: '#1a2e1a' }}
            >
              Transformez vos achats en opportunité commerciale
            </h3>
            <p className="text-sm" style={{ color: '#5a7060' }}>
              Achetez d'abord, rejoignez le réseau ensuite. Commissions directes + réseau + bonus mensuels.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link href="/register">
              <button
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #2d7a2d, #1a5c1a)',
                  color: '#FFFFFF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(45,122,45,0.25)',
                }}
              >
                En savoir plus →
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: '1px solid #e8f0e0', background: '#f9fcf5' }}>
        <div className="container-agri py-5 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs" style={{ color: '#78906e' }}>
            © {currentYear} AGRIKIRI. Tous droits réservés.
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#78906e' }}>
            <span>Fait avec</span>
            <span style={{ color: '#D9344A' }}>❤</span>
            <span>pour Haïti 🇭🇹</span>
          </div>
          <a
            href="https://codeshell-green.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="text-xs footer-link font-medium"
            style={{ color: '#78906e' }}
          >
            Site développé par Christopher JEROME
          </a>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs footer-link" style={{ color: '#78906e' }}>
              Confidentialité
            </Link>
            <span style={{ color: '#c8d8c0' }}>·</span>
            <Link href="/terms" className="text-xs footer-link" style={{ color: '#78906e' }}>
              Conditions
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link { color: #5a7060; }
        .footer-link:hover { color: #1a5c1a; }
        .social-icon-btn:hover { background: #dcf0d0 !important; color: #2d7a2d !important; border-color: rgba(45,122,45,0.3) !important; }
      `}</style>
    </footer>
  );
}
