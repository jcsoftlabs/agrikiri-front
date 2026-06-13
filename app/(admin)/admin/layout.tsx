'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [hasMounted, setHasMounted] = useState(false);

  const effectiveToken =
    token || (hasMounted && typeof window !== 'undefined' ? localStorage.getItem('agrikiri_token') : null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (effectiveToken && !user) {
      void checkAuth();
    }
  }, [checkAuth, effectiveToken, user]);

  useEffect(() => {
    if (!hasMounted || isLoading) return;

    if (!effectiveToken) {
      router.replace('/login');
      return;
    }

    if (!user) return;

    if (user.role !== 'ADMIN' && user.role !== 'CASHIER' && user.role !== 'ACCOUNTANT') {
      router.replace('/dashboard');
      return;
    }

    if (user.role === 'CASHIER' && pathname !== '/admin/pos') {
      router.replace('/admin/pos');
      return;
    }

    if (user.role === 'ACCOUNTANT' && pathname !== '/admin/accounting') {
      router.replace('/admin/accounting');
    }
  }, [effectiveToken, hasMounted, isLoading, pathname, router, user]);

  if (!hasMounted || !effectiveToken || isLoading || !user || (user.role !== 'ADMIN' && user.role !== 'CASHIER' && user.role !== 'ACCOUNTANT')) {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-agri-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement de l'espace administrateur...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
