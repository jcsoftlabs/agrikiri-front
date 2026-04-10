'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token && !isAuthenticated) {
      router.replace('/login?next=%2Fdashboard');
      return;
    }

    if (token && !user && !isLoading) {
      void checkAuth();
    }
  }, [checkAuth, isAuthenticated, isLoading, router, token, user]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [router, user]);

  if (!token || isLoading || !user || user.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center">
        <div className="text-gray-500 text-lg">Chargement...</div>
      </div>
    );
  }

  return <>{children}</>;
}
