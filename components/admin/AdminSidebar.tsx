'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const NAV_LINKS = [
  { icon: '📊', label: 'Tableau de bord', href: '/admin' },
  { icon: '📦', label: 'Catalogue', href: '/admin/products' },
  { icon: '🛒', label: 'Commandes', href: '/admin/orders' },
  { icon: '👥', label: 'Utilisateurs', href: '/admin/users' },
  { icon: '🌐', label: 'Réseau MLM', href: '/admin/mlm' },
  { icon: '📈', label: 'Rapports', href: '/admin/reports' },
  { icon: '⚙️', label: 'Paramètres', href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 bg-agri-dark/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-agri-green-500 to-agri-green-700 rounded-xl flex items-center justify-center text-white font-display text-xl font-bold shadow-lg">
              A
            </div>
            <div className="min-w-0">
              <span className="font-display text-lg font-bold text-white block leading-tight">AGRIKIRI</span>
              <span className="text-xs text-agri-green-400 font-medium tracking-wide">Admin Panel</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-colors"
            aria-label="Ouvrir le menu admin"
          >
            ☰
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold border transition-colors ${
                  isActive
                    ? 'bg-agri-green-600 border-agri-green-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/75'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-label="Fermer le menu admin"
          />
          <aside className="absolute inset-y-0 left-0 w-[88%] max-w-sm bg-agri-dark shadow-2xl flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
              <Link href="/admin" className="flex items-center gap-3 min-w-0" onClick={closeMobileMenu}>
                <div className="w-10 h-10 bg-gradient-to-br from-agri-green-500 to-agri-green-700 rounded-xl flex items-center justify-center text-white font-display text-xl font-bold shadow-lg">
                  A
                </div>
                <div className="min-w-0">
                  <span className="font-display text-lg font-bold text-white block leading-tight">AGRIKIRI</span>
                  <span className="text-xs text-agri-green-400 font-medium tracking-wide">Admin Panel</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors"
                aria-label="Fermer le menu"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {NAV_LINKS.map((link) => {
                const isActive = link.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                      isActive
                        ? 'bg-agri-green-600 text-white shadow-md'
                        : 'text-gray-400 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    {link.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-agri-green-700 to-agri-green-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.firstName?.[0] ?? 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'Admin AGRIKIRI'}
                  </div>
                  <div className="text-gray-400 text-xs truncate">{user?.email ?? 'admin@agrikiri.ht'}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full text-left text-sm text-gray-300 hover:text-red-400 transition-colors flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5"
              >
                <span>↩</span> Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-64 bg-agri-dark fixed top-0 left-0 h-full z-30 shadow-2xl">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-agri-green-500 to-agri-green-700 rounded-xl flex items-center justify-center text-white font-display text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="font-display text-lg font-bold text-white block leading-tight">AGRIKIRI</span>
              <span className="text-xs text-agri-green-400 font-medium tracking-wide">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                  isActive
                    ? 'bg-agri-green-600 text-white shadow-md'
                    : 'text-gray-400 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer utilisateur */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-agri-green-700 to-agri-green-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Admin AGRIKIRI'}
              </div>
              <div className="text-gray-400 text-xs truncate">{user?.email ?? 'admin@agrikiri.ht'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <span>↩</span> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
