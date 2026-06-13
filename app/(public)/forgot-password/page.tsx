'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

type Step = 'request' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const forgotPasswordMutation = useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await api.post('/auth/forgot-password', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Si cet email existe, un code à 6 chiffres a été envoyé.');
      setStep('reset');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’envoyer le code de réinitialisation.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { email: string; code: string; newPassword: string }) => {
      const { data } = await api.post('/auth/reset-password', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé avec succès.');
      setStep('success');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de réinitialiser le mot de passe.');
    },
  });

  const handleRequestCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    forgotPasswordMutation.mutate({ email: email.trim() });
  };

  const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }

    resetPasswordMutation.mutate({
      email: email.trim(),
      code: code.trim(),
      newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <main className="pt-24">
        <section className="container-agri py-16 lg:py-20">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-gray-100 bg-white p-8 lg:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-agri-green-200 bg-agri-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700">
              Assistance compte
            </div>

            <h1 className="mt-6 font-display text-4xl text-agri-dark">Mot de passe oublié</h1>
            <p className="mt-5 text-base leading-8 text-gray-600">
              Entre ton email, reçois un code à 6 chiffres, puis confirme-le pour définir un nouveau mot de passe.
            </p>

            {step === 'request' && (
              <form onSubmit={handleRequestCode} className="mt-8 space-y-6">
                <div className="rounded-3xl border border-gray-100 bg-agri-cream/60 p-6">
                  <label className="block text-sm font-semibold text-agri-dark" htmlFor="email">
                    Adresse email du compte
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="client@exemple.com"
                    className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-agri-dark outline-none transition focus:border-agri-green-400"
                    required
                  />
                  <p className="mt-3 text-sm text-gray-500">
                    Nous enverrons un code de sécurité valable pendant 15 minutes à cette adresse.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" loading={forgotPasswordMutation.isPending}>
                    Envoyer le code
                  </Button>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-agri-green-200 bg-white px-6 py-3 text-sm font-semibold text-agri-green-700 transition hover:bg-agri-green-50"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
                <div className="rounded-3xl border border-agri-green-100 bg-agri-green-50/70 p-6 text-sm text-gray-600">
                  Le code a été demandé pour <strong className="text-agri-dark">{email}</strong>. Saisis-le ci-dessous avec ton nouveau mot de passe.
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-agri-dark" htmlFor="code">
                      Code à 6 chiffres
                    </label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-lg tracking-[0.35em] text-agri-dark outline-none transition focus:border-agri-green-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-agri-dark" htmlFor="new-password">
                      Nouveau mot de passe
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-agri-dark outline-none transition focus:border-agri-green-400"
                      minLength={8}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-agri-dark" htmlFor="confirm-password">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-agri-dark outline-none transition focus:border-agri-green-400"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" loading={resetPasswordMutation.isPending}>
                    Réinitialiser le mot de passe
                  </Button>
                  <button
                    type="button"
                    onClick={() => forgotPasswordMutation.mutate({ email: email.trim() })}
                    className="inline-flex items-center justify-center rounded-2xl border border-agri-green-200 bg-white px-6 py-3 text-sm font-semibold text-agri-green-700 transition hover:bg-agri-green-50"
                  >
                    Renvoyer le code
                  </button>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="mt-8 space-y-6">
                <div className="rounded-3xl border border-agri-green-100 bg-agri-green-50 p-6">
                  <h2 className="text-xl font-semibold text-agri-dark">Réinitialisation réussie</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    Ton mot de passe a été mis à jour. Un email de confirmation vient aussi d’être envoyé à <strong className="text-agri-dark">{email}</strong>.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-agri-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    Se connecter
                  </Link>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="inline-flex items-center justify-center rounded-2xl border border-agri-green-200 bg-white px-6 py-3 text-sm font-semibold text-agri-green-700 transition hover:bg-agri-green-50"
                  >
                    Réinitialiser un autre compte
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
