'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('next')
    : null;
  const safeNextPath = nextPath?.startsWith('/') ? nextPath : null;
  const registerHref = safeNextPath ? `/register?next=${encodeURIComponent(safeNextPath)}` : '/register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login({ email, password });
      toast.success('Connexion réussie ! Redirection...');
      router.push(user.role === 'ADMIN' ? '/admin' : safeNextPath || '/shop');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      {/* Left panel: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-agri-green-600 rounded-xl flex items-center justify-center text-white font-display text-xl font-bold">
              A
            </div>
            <span className="font-display text-2xl font-bold text-agri-green-800">AGRIKIRI</span>
          </Link>

          <h1 className="font-display text-4xl text-agri-dark mb-2">Connexion</h1>
          <p className="text-gray-500 mb-8">
            Pas encore de compte ?{' '}
            <Link href={registerHref} className="text-agri-green-600 font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <Link href="/forgot-password" className="text-xs text-agri-green-600 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Connexion
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400">
              En vous connectant, vous acceptez nos{' '}
              <Link href="/terms" className="text-agri-green-600 hover:underline">conditions d&apos;utilisation</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel: visual */}
      <div className="hidden lg:flex flex-1 bg-agri-green-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-8xl mb-8 animate-float">🌾</div>
          <h2 className="font-display text-4xl text-white mb-4">
            Bienvenue sur AGRIKIRI
          </h2>
          <p className="text-white/70 text-lg">
            La plateforme e-commerce dédiée aux produits locaux haïtiens.
            Achetez local, vendez et gagnez.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {['🌱', '💰', '🇭🇹', '🏆'].map((e, i) => (
              <div key={i} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
