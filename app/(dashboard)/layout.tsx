'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token && !isAuthenticated) {
      // Encode le chemin actuel pour y revenir après login
      const nextParam = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${nextParam}`);
      return;
    }

    if (token && !user && !isLoading) {
      void checkAuth();
    }
  }, [checkAuth, isAuthenticated, isLoading, pathname, router, token, user]);

  useEffect(() => {
    if (!user) return;
    const isProfilePage = pathname === '/profile';

    // Redirections forcées selon le rôle si on n'est pas au bon endroit
    if (user.role === 'ADMIN' && !isProfilePage) {
      router.replace('/admin');
      return;
    }

    if (user.role === 'CASHIER' && !isProfilePage) {
      router.replace('/admin/pos');
      return;
    }

    if (user.role === 'ACCOUNTANT' && !isProfilePage) {
      router.replace('/admin/accounting');
      return;
    }

    if (user.role === 'STOCK_MANAGER' && pathname !== '/stock' && !isProfilePage) {
      router.replace('/stock');
      return;
    }

    if (user.role === 'ASSOCIATE' && pathname === '/dashboard') {
      router.replace('/board');
      return;
    }

    if (user.role === 'BUYER' && pathname === '/dashboard') {
      router.replace('/buyer');
      return;
    }

    if (user.role === 'BUYER' && pathname.startsWith('/delivery')) {
      router.replace('/buyer');
      return;
    }

    if (user.role === 'DELIVERY_AGENT' && pathname.startsWith('/buyer')) {
      router.replace('/delivery');
      return;
    }

    if (user.role === 'DELIVERY_AGENT' && pathname !== '/delivery' && !pathname.startsWith('/orders/') && !isProfilePage) {
      router.replace('/delivery');
    }
  }, [pathname, router, user]);

  if (!token || isLoading || !user) {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center">
        <div className="text-gray-500 text-lg">Chargement...</div>
      </div>
    );
  }

  return <>{children}</>;
}
