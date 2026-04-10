'use client';

import Link from 'next/link';
import LevelBadge from '@/components/mlm/LevelBadge';
import { useAuthStore } from '@/store/authStore';

const customerSidebarLinks = [
  { icon: '📊', label: 'Mon espace', href: '/dashboard' },
  { icon: '📦', label: 'Mes Commandes', href: '/orders' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const ayizanSidebarLinks = [
  { icon: '📊', label: 'Tableau de bord', href: '/dashboard' },
  { icon: '🌐', label: 'Mon Réseau', href: '/network' },
  { icon: '📦', label: 'Mes Commandes', href: '/orders' },
  { icon: '💰', label: 'Mes Gains', href: '/earnings' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

interface DashboardNavProps {
  currentPath: string;
}

export default function DashboardNav({ currentPath }: DashboardNavProps) {
  const { user, logout } = useAuthStore();
  const isAyizan = user?.role === 'AYIZAN';
  const sidebarLinks = (isAyizan ? ayizanSidebarLinks : customerSidebarLinks).map((link) => ({
    ...link,
    active: currentPath === link.href,
  }));

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-30 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-agri-green-600 rounded-xl flex items-center justify-center text-white font-display text-lg font-bold">A</div>
            <span className="font-display text-xl font-bold text-agri-green-800">AGRIKIRI</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`sidebar-link ${link.active ? 'active' : ''} group`}>
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-agri-green-50">
            <div className="w-10 h-10 bg-agri-green-200 rounded-full flex items-center justify-center text-lg overflow-hidden">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" /> : '👤'}
            </div>
            <div>
              <div className="font-semibold text-agri-dark text-sm">{user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}</div>
              <LevelBadge level={user?.mlmLevel || 'CUSTOMER'} size="sm" />
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-3 text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="lg:hidden mb-6">
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-agri-green-200 rounded-full flex items-center justify-center text-lg overflow-hidden">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" /> : '👤'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-agri-dark text-sm truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
              </div>
              <div className="mt-1">
                <LevelBadge level={user?.mlmLevel || 'CUSTOMER'} size="sm" />
              </div>
            </div>
            <button
              onClick={logout}
              className="ml-auto text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Déconnexion
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold border ${
                  link.active
                    ? 'bg-agri-green-600 border-agri-green-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
