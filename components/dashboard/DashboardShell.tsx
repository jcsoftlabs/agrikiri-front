'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import DashboardNav from '@/components/dashboard/DashboardNav';
import LevelBadge from '@/components/mlm/LevelBadge';
import { useAuthStore } from '@/store/authStore';

interface DashboardShellProps {
  currentPath: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  headerAction?: ReactNode;
  contentClassName?: string;
}

export default function DashboardShell({
  currentPath,
  title,
  subtitle,
  children,
  headerAction,
  contentClassName = '',
}: DashboardShellProps) {
  const { user, logout } = useAuthStore();
  const displayLevel =
    user?.role === 'AYIZAN'
      ? (user?.mlmLevel || 'AYIZAN')
      : user?.role === 'BUYER'
        ? 'BUYER'
        : user?.role === 'STOCK_MANAGER'
          ? 'STOCK_MANAGER'
          : user?.role === 'DELIVERY_AGENT'
            ? 'DELIVERY_AGENT'
            : user?.role === 'ACCOUNTANT'
              ? 'ACCOUNTANT'
              : user?.role === 'CASHIER'
                ? 'CASHIER'
                : user?.role === 'ASSOCIATE'
                  ? 'ASSOCIATE'
                  : user?.role === 'ADMIN'
                    ? 'ADMIN'
                    : 'CUSTOMER';

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <DashboardNav currentPath={currentPath} />

      <main className="flex-1 lg:ml-64 pb-28 lg:pb-10">
        <div className="px-4 pt-4 lg:px-8 lg:pt-8">
          <div className="mb-6 rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_18px_60px_rgba(24,50,34,0.08)] backdrop-blur-sm lg:p-6">
            <div className="flex items-start gap-3 lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-agri-green-100 flex items-center justify-center text-xl shadow-inner">
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-agri-dark">
                      {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
                    </div>
                    <div className="mt-1">
                      <LevelBadge level={displayLevel} size="sm" />
                    </div>
                  </div>
                </div>

                <h1 className="font-display text-3xl leading-tight text-agri-dark lg:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 lg:text-base">{subtitle}</p>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <Link
                  href="/profile"
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700"
                >
                  Mon profil
                </Link>
                {headerAction}
                <button
                  onClick={logout}
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
                >
                  Déconnexion
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700"
                >
                  Mon profil
                </Link>
                {headerAction}
              </div>
              <button
                onClick={logout}
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
              >
                Déconnexion
              </button>
            </div>
          </div>

          <div className={contentClassName}>{children}</div>
        </div>
      </main>
    </div>
  );
}
