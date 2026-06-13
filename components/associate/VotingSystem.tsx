'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import { IS_MOCK, MOCK_VOTES } from '@/lib/mockData';

interface Vote {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  dossier?: { title: string };
  _count: { ballots: number };
}

interface DossierOption {
  id: string;
  title: string;
}

export default function VotingSystem() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canVote = user?.associateType === 'PDG' || user?.associateType === 'VOTING';
  const canCreateVote = user?.associateType === 'PDG';
  const [isCreating, setIsCreating] = useState(false);
  const [voteForm, setVoteForm] = useState({
    title: '',
    description: '',
    dossierId: '',
    expiresAt: '',
  });

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['associate-votes'],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_VOTES as unknown as Vote[];
      const response = await api.get('/associates/votes');
      return response.data.data as Vote[];
    }
  });

  const { data: dossiers = [] } = useQuery({
    queryKey: ['associate-dossiers-options'],
    queryFn: async () => {
      if (IS_MOCK) return [] as DossierOption[];
      const response = await api.get('/associates/dossiers');
      return response.data.data as DossierOption[];
    },
    enabled: canCreateVote,
  });

  const createVoteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: voteForm.title.trim(),
        description: voteForm.description.trim() || undefined,
        dossierId: voteForm.dossierId || undefined,
        expiresAt: voteForm.expiresAt ? new Date(voteForm.expiresAt).toISOString() : undefined,
      };

      if (IS_MOCK) {
        toast.success('[Mock] Session de vote créée');
        return payload as any;
      }

      const response = await api.post('/associates/votes', payload);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Session de vote créée');
      setVoteForm({ title: '', description: '', dossierId: '', expiresAt: '' });
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['associate-votes'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de créer la session de vote'),
  });

  const handleCreateVote = () => {
    if (voteForm.title.trim().length < 3) {
      toast.error('Le titre du vote doit contenir au moins 3 caractères.');
      return;
    }

    createVoteMutation.mutate();
  };

  const voteMutation = useMutation({
    mutationFn: ({ voteId, choice }: { voteId: string; choice: string }) => {
      if (IS_MOCK) {
        toast.success(`[Mock] Vote «réenregistré» (non persisté — DB hors ligne)`);
        return Promise.resolve() as any;
      }
      return api.post(`/associates/votes/${voteId}/ballot`, { choice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associate-votes'] });
      toast.success('Vote enregistré');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur lors du vote')
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-agri-dark">Sessions de Vote Actives</h3>
          <span className="text-xs text-gray-400">Total: {votes.length}</span>
        </div>
        {canCreateVote && (
          <Button onClick={() => setIsCreating((current) => !current)} variant="primary" size="sm">
            {isCreating ? 'Fermer' : 'Nouveau vote'}
          </Button>
        )}
      </div>

      {canCreateVote && isCreating && (
        <div className="card p-6 border-2 border-agri-green-500 bg-agri-green-50/20">
          <div className="mb-4">
            <h4 className="font-bold text-agri-dark">Créer une session de vote</h4>
            <p className="mt-1 text-sm text-gray-500">
              Les associés habilités pourront voter pour, contre ou s’abstenir.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-agri-green-700">
              Quorum dossier : 3 votes suffisent
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre du vote</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Ex: Approbation du budget hebdomadaire"
                value={voteForm.title}
                onChange={(event) => setVoteForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dossier lié</label>
              <select
                className="input w-full"
                value={voteForm.dossierId}
                onChange={(event) => setVoteForm((current) => ({ ...current, dossierId: event.target.value }))}
              >
                <option value="">Aucun dossier spécifique</option>
                {dossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>
                    {dossier.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiration</label>
              <input
                type="datetime-local"
                className="input w-full"
                value={voteForm.expiresAt}
                onChange={(event) => setVoteForm((current) => ({ ...current, expiresAt: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                className="input min-h-[110px] w-full"
                placeholder="Contexte de la décision, point à approuver, éléments importants..."
                value={voteForm.description}
                onChange={(event) => setVoteForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateVote} loading={createVoteMutation.isPending}>
              Créer la session
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => <div key={i} className="shimmer h-64 w-full rounded-2xl" />)
        ) : votes.length === 0 ? (
          <div className="py-20 text-center text-gray-400 italic">Aucune session de vote en cours.</div>
        ) : (
          votes.map((vote) => (
            <div key={vote.id} className="card p-8 bg-gradient-to-br from-white to-gray-50/50">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-agri-gold-100 flex items-center justify-center text-agri-gold-700">⚖️</span>
                    <h4 className="font-display text-2xl text-agri-dark">{vote.title}</h4>
                  </div>
                  {vote.dossier && (
                    <div className="text-sm font-bold text-agri-green-700 mb-4 px-3 py-1 bg-agri-green-50 inline-block rounded-lg">
                      Dossier: {vote.dossier.title}
                    </div>
                  )}
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {vote.description || 'Pas de description supplémentaire.'}
                  </p>

                  <div className="flex items-center gap-6 text-xs text-gray-400">
                    <div>📅 Créé le: {new Date(vote.createdAt).toLocaleDateString()}</div>
                    {vote.expiresAt && (
                      <div className="text-orange-500 font-bold">⏰ Expire le: {new Date(vote.expiresAt).toLocaleDateString()}</div>
                    )}
                    <div className="bg-white px-2 py-1 rounded border border-gray-100">
                      👥 Participation: <span className="font-bold text-agri-dark">{vote._count.ballots}</span> votes exprimés
                    </div>
                    <div className="bg-agri-green-50 px-2 py-1 rounded border border-agri-green-100 text-agri-green-700 font-semibold">
                      Quorum: 3 votes
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
                  <div className="text-center p-3 rounded-2xl bg-white border border-gray-100 mb-2">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Votre Choix</p>
                    <p className="text-sm font-semibold text-agri-dark">
                      {canVote ? 'Action requise' : 'Lecture seule (Observateur)'}
                    </p>
                  </div>

                  {canVote && (
                    <>
                      <Button
                        variant="primary"
                        className="w-full !rounded-2xl py-4 bg-agri-green-600"
                        onClick={() => voteMutation.mutate({ voteId: vote.id, choice: 'FOR' })}
                      >
                        ✅ POUR
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full !rounded-2xl py-4 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                        onClick={() => voteMutation.mutate({ voteId: vote.id, choice: 'AGAINST' })}
                      >
                        ❌ CONTRE
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full !rounded-2xl py-4 text-gray-400"
                        onClick={() => voteMutation.mutate({ voteId: vote.id, choice: 'ABSTAIN' })}
                      >
                        ⚪ ABSTENTION
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
