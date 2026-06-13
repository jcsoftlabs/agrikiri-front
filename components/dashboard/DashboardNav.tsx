'use client';

import Link from 'next/link';
import LevelBadge from '@/components/mlm/LevelBadge';
import { useAuthStore } from '@/store/authStore';

const customerSidebarLinks = [
  { icon: '📊', label: 'Mon espace', href: '/dashboard' },
  { icon: '📦', label: 'Mes Commandes', href: '/orders' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const buyerSidebarLinks = [
  { icon: '🧾', label: 'Achats terrain', href: '/buyer' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const stockManagerSidebarLinks = [
  { icon: '🏬', label: 'Gestion Stock', href: '/stock' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const deliveryAgentSidebarLinks = [
  { icon: '🚚', label: 'Mes livraisons', href: '/delivery' },
  { icon: '📦', label: 'Mes Commandes', href: '/orders' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const adminSidebarLinks = [
  { icon: '🛠', label: 'Espace Admin', href: '/admin' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const cashierSidebarLinks = [
  { icon: '🏪', label: 'Mini POS', href: '/admin/pos' },
  { icon: '👤', label: 'Mon Profil', href: '/profile' },
];

const accountantSidebarLinks = [
  { icon: '💼', label: 'Comptabilité', href: '/admin/accounting' },
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
  const isAssociate = user?.role === 'ASSOCIATE';
  const isBuyer = user?.role === 'BUYER';
  const isStockManager = user?.role === 'STOCK_MANAGER';
  const isDeliveryAgent = user?.role === 'DELIVERY_AGENT';
  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const displayLevel = isAyizan ? (user?.mlmLevel || 'AYIZAN') : isBuyer ? 'BUYER' : 'CUSTOMER';

  let baseLinks = isAdmin
    ? adminSidebarLinks
    : isCashier
      ? cashierSidebarLinks
      : isAccountant
        ? accountantSidebarLinks
        : isAyizan
          ? ayizanSidebarLinks
          : isBuyer
            ? buyerSidebarLinks
            : isStockManager
              ? stockManagerSidebarLinks
              : isDeliveryAgent
                ? deliveryAgentSidebarLinks
                : customerSidebarLinks;

  if (isAssociate) {
    baseLinks = [
      { icon: '🤝', label: 'Espace Associés', href: '/board' },
      ...baseLinks
    ];
  }

  const sidebarLinks = baseLinks.map((link) => ({
    ...link,
    active: currentPath === link.href || (currentPath.startsWith('/orders') && link.href === '/orders'),
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
              <LevelBadge level={displayLevel} size="sm" />
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

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 safe-area-pb">
        <div className="mx-auto max-w-md rounded-[28px] border border-white/70 bg-white/92 p-2 shadow-[0_18px_50px_rgba(18,38,28,0.16)] backdrop-blur-2xl">
          <div className={`grid ${sidebarLinks.length <= 3 ? 'grid-cols-3' : 'grid-cols-5'} gap-1`}>
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[22px] px-1.5 py-2.5 text-center transition-all ${
                link.active ? 'bg-agri-green-50/90' : 'hover:bg-gray-50/90'
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-[18px] text-lg transition-all ${
                  link.active
                    ? 'bg-gradient-to-br from-agri-green-500 to-agri-green-700 text-white shadow-[0_10px_24px_rgba(53,128,68,0.28)]'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {link.icon}
              </span>
              <span
                className={`text-[11px] font-semibold leading-tight ${
                  link.active ? 'text-agri-green-700' : 'text-gray-500'
                }`}
              >
                {link.label}
              </span>
              <span
                className={`h-1.5 rounded-full transition-all ${
                  link.active ? 'w-6 bg-agri-gold-400' : 'w-1.5 bg-transparent'
                }`}
              />
            </Link>
          ))}
        </div>
        </div>
      </nav>
    </>
  );
}
