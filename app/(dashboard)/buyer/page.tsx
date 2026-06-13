'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import BuyerDashboard from '@/components/buyer/BuyerDashboard';
import { useAuthStore } from '@/store/authStore';

export default function BuyerPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== 'BUYER') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  return (
    <DashboardShell
      currentPath="/buyer"
      title="Dashboard Acheteur"
      subtitle="Confirmez les montants reçus, suivez vos achats terrain et transmettez vos rapports de dépenses ligne par ligne."
    >
      <BuyerDashboard />
    </DashboardShell>
  );
}
