'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-8 border-b border-gray-100 pb-6">
          <h1 className="font-display text-3xl text-agri-dark">Paramètres</h1>
          <p className="text-gray-500 mt-1">Gérez les configurations globales du système et du réseau MLM.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <h3 className="font-semibold text-lg text-agri-dark mb-4 border-b pb-2">Configuration MLM</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Quota Minimum (PSK)</span>
                <span className="font-mono bg-white px-2 py-1 rounded border text-agri-green-700">546</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Base 1 PSK</span>
                <span className="font-mono bg-white px-2 py-1 rounded border text-agri-green-700">15 HTG</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Réseau Niveau 1</span>
                <span className="font-mono bg-white px-2 py-1 rounded border text-agri-green-700">20%</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Réseau Niveau 2</span>
                <span className="font-mono bg-white px-2 py-1 rounded border text-agri-green-700">10%</span>
              </div>
              <button disabled className="w-full mt-4 py-2 border border-agri-green-200 text-agri-green-600 rounded-lg hover:bg-agri-green-50 transition-colors opacity-50 cursor-not-allowed">
                Modifier les règles (Bientôt)
              </button>
            </div>
          </div>

          <div className="card p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <h3 className="font-semibold text-lg text-agri-dark mb-4 border-b pb-2">Sécurité & API</h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-500 bg-blue-50 text-blue-800 p-3 rounded-lg mb-4">
                L'authentification à deux facteurs et la gestion des clés API seront disponibles dans la v2.0
              </div>
              <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                Gérer les accès
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
