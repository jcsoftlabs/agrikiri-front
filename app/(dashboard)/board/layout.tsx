import DashboardNav from '@/components/dashboard/DashboardNav';

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-agri-cream flex">
      <DashboardNav currentPath="/board" />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
