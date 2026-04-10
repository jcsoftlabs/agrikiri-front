'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    referralCode: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const nextPath = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('next')
    : null;
  const safeNextPath = nextPath?.startsWith('/') ? nextPath : null;
  const loginHref = safeNextPath ? `/login?next=${encodeURIComponent(safeNextPath)}` : '/login';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      toast.success('Compte créé avec succès ! Redirection...');
      if (safeNextPath) {
        router.push(safeNextPath);
        return;
      }
      setStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-agri-cream flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="font-display text-4xl text-agri-dark mb-4">Bienvenue sur AGRIKIRI !</h1>
          <p className="text-gray-600 mb-8">
            Votre compte a été créé avec succès. Commencez à explorer notre boutique de produits haïtiens.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/shop">
              <Button variant="primary" size="lg" className="w-full">🛒 Visiter la boutique</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="w-full">📊 Mon tableau de bord</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-cream flex">
      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-agri-green-600 rounded-xl flex items-center justify-center text-white font-display text-xl font-bold">A</div>
            <span className="font-display text-2xl font-bold text-agri-green-800">AGRIKIRI</span>
          </Link>

          <h1 className="font-display text-4xl text-agri-dark mb-2">Créer un compte</h1>
          <p className="text-gray-500 mb-8">
            Déjà inscrit ?{' '}
            <Link href={loginHref} className="text-agri-green-600 font-semibold hover:underline">Se connecter</Link>
          </p>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? 'bg-agri-green-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          <form id="register-form" onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit} className="space-y-5">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-firstName" className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                    <input id="reg-firstName" name="firstName" type="text" value={form.firstName} onChange={handleChange} className="input" placeholder="Jean" required />
                  </div>
                  <div>
                    <label htmlFor="reg-lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                    <input id="reg-lastName" name="lastName" type="text" value={form.lastName} onChange={handleChange} className="input" placeholder="Pierre" required />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="jean@exemple.com" required />
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full">Continuer →</Button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone haïtien</label>
                  <div className="flex gap-2">
                    <span className="input w-auto px-3 bg-gray-50 text-gray-500 flex items-center">🇭🇹 +509</span>
                    <input id="reg-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} className="input flex-1" placeholder="36123456" required />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      className="input pr-11"
                      placeholder="8 caractères minimum"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-agri-green-600 transition-colors p-1 rounded-lg"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
                        // Œil barré
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        // Œil ouvert
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Indicateur de force */}
                  {form.password.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {[1,2,3,4].map((level) => {
                        const strength = form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 4 : 3;
                        return (
                          <div key={level} className={`flex-1 h-1 rounded-full transition-all ${
                            level <= strength
                              ? strength === 1 ? 'bg-red-400' : strength === 2 ? 'bg-orange-400' : strength === 3 ? 'bg-yellow-400' : 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                        );
                      })}
                      <span className="text-xs text-gray-400 ml-2">
                        {form.password.length < 8 ? 'Trop court' : form.password.length < 12 ? 'Moyen' : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 'Fort' : 'Bien'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`input pr-11 ${
                        confirmPassword.length > 0
                          ? confirmPassword === form.password
                            ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                            : 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : ''
                      }`}
                      placeholder="Répétez votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-agri-green-600 transition-colors p-1 rounded-lg"
                      aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Feedback visuel en temps réel */}
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${
                      confirmPassword === form.password ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {confirmPassword === form.password ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-referral" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input id="reg-referral" name="referralCode" type="text" value={form.referralCode} onChange={handleChange} className="input" placeholder="AGK-XXXXXX" />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>← Retour</Button>
                  <Button
                    id="register-submit"
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={confirmPassword !== form.password || form.password.length < 8}
                    className="flex-1"
                  >
                    Créer mon compte
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Visual */}
      <div className="hidden lg:flex flex-1 bg-agri-green-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl text-white mb-8">Pourquoi rejoindre AGRIKIRI ?</h2>
          <div className="space-y-4">
            {[
              { icon: '🌾', title: 'Produits 100% haïtiens', desc: 'Riz local et produits locaux de qualité supérieure' },
              { icon: '💰', title: 'Gagnez des commissions', desc: '10% sur vos ventes directes, 5% sur votre réseau' },
              { icon: '🚀', title: 'Progressez rapidement', desc: '8 niveaux inspirés des héros haïtiens' },
              { icon: '🏆', title: 'Aucun frais d\'entrée', desc: 'Commencez par un achat de produits (9,500 HTG)' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 bg-white/10 rounded-2xl">
                <span className="text-3xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="text-sm text-white/70">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
