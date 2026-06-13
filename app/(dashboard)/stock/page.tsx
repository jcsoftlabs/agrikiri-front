'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardShell from '@/components/dashboard/DashboardShell';
import StockManagerDashboard from '@/components/stock/StockManagerDashboard';

export default function StockPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user && user.role !== 'STOCK_MANAGER') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  return (
    <DashboardShell
      currentPath="/stock"
      title="Dashboard Stock"
      subtitle="Confirmez les réceptions buyers, mettez à jour le stock physique, assignez les commandes aux livreurs et publiez vos rapports stock."
    >
      <StockManagerDashboard />
    </DashboardShell>
  );
}
