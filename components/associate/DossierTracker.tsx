'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import { IS_MOCK, MOCK_DOSSIERS } from '@/lib/mockData';
import { ACCOUNTING_CHANNEL_OPTIONS, getAccountingChannelLabel } from '@/lib/accounting-channels';

interface Dossier {
  id: string;
  title: string;
  description: string;
  disbursementLines?: { reason: string; amount: number }[];
  disbursementTotal?: number | string;
  disbursementMethod?: string;
  voteBallotsCount?: number;
  status: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
  _count: { documents: number; votes: number };
}

interface DossierDecision {
  id: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  note?: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    associateType?: string | null;
  };
}

interface DisbursementLineForm {
  id: string;
  reason: string;
  amount: string;
}

function createEmptyLine(): DisbursementLineForm {
  return {
    id: Math.random().toString(36).slice(2, 10),
    reason: '',
    amount: '',
  };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const decisionLabels = {
  APPROVE: 'Approuvé',
  REJECT: 'Refusé',
  REQUEST_CHANGES: 'Correction demandée',
};

const decisionStyles = {
  APPROVE: 'bg-agri-green-50 text-agri-green-700 border-agri-green-100',
  REJECT: 'bg-red-50 text-red-700 border-red-100',
  REQUEST_CHANGES: 'bg-amber-50 text-amber-700 border-amber-100',
};

export default function DossierTracker() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    disbursementMethod: 'CASH',
    disbursementLines: [createEmptyLine()],
  });

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['associate-dossiers'],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_DOSSIERS as unknown as Dossier[];
      const response = await api.get('/associates/dossiers');
      return response.data.data as Dossier[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; disbursementMethod: string; disbursementLines: { reason: string; amount: number }[] }) => {
      if (IS_MOCK) {
        toast.success('[Mock] Dossier créé (non persisté — DB hors ligne)');
        return payload as any;
      }
      const response = await api.post('/associates/dossiers', payload);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Dossier créé avec succès');
      setFormData({ title: '', description: '', disbursementMethod: 'CASH', disbursementLines: [createEmptyLine()] });
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['associate-dossiers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de créer le dossier.');
    },
  });

  const activeLines = formData.disbursementLines.filter((line) => line.reason.trim() || line.amount.trim());
  const disbursementTotal = activeLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const updateLine = (lineId: string, field: 'reason' | 'amount', value: string) => {
    setFormData((current) => ({
      ...current,
      disbursementLines: current.disbursementLines.map((line) =>
        line.id === lineId ? { ...line, [field]: field === 'amount' ? value.replace(/[^\d.]/g, '') : value } : line
      ),
    }));
  };

  const addLine = () => {
    setFormData((current) => ({
      ...current,
      disbursementLines: [...current.disbursementLines, createEmptyLine()],
    }));
  };

  const removeLine = (lineId: string) => {
    setFormData((current) => ({
      ...current,
      disbursementLines:
        current.disbursementLines.length > 1
          ? current.disbursementLines.filter((line) => line.id !== lineId)
          : [createEmptyLine()],
    }));
  };

  const handleCreateDossier = () => {
    const preparedLines = formData.disbursementLines
      .filter((line) => line.reason.trim() || line.amount.trim())
      .map((line) => ({
        reason: line.reason.trim(),
        amount: Number(line.amount),
      }));

    const hasInvalidLine = preparedLines.some((line) => !line.reason || !Number.isFinite(line.amount) || line.amount <= 0);
    if (hasInvalidLine) {
      toast.error('Chaque ligne doit avoir un motif et un montant valide.');
      return;
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      disbursementLines: preparedLines,
      disbursementMethod: formData.disbursementMethod,
    });
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-agri-dark">Gestion des Dossiers</h3>
        <Button onClick={() => setIsCreating(true)} variant="primary" size="sm">
          ➕ Nouveau Dossier
        </Button>
      </div>

      {/* Create Form Modal (Simple) */}
      {isCreating && (
        <div className="card p-6 border-2 border-agri-green-500 bg-agri-green-50/20">
          <h4 className="font-bold mb-4">Initialiser un nouveau dossier</h4>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Titre du dossier"
              className="w-full rounded-xl border-gray-200 p-3 text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <textarea
              placeholder="Description détaillée..."
              className="w-full rounded-xl border-gray-200 p-3 text-sm h-32"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Moyen de décaissement</label>
              <select
                className="input w-full"
                value={formData.disbursementMethod}
                onChange={(e) => setFormData({ ...formData, disbursementMethod: e.target.value })}
              >
                {ACCOUNTING_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[1.6fr_0.8fr_auto] gap-0 border-b border-gray-100 bg-agri-green-50/70 text-xs font-bold uppercase tracking-[0.18em] text-agri-green-700">
                <div className="px-4 py-3">Motif</div>
                <div className="px-4 py-3">Montant</div>
                <div className="px-4 py-3 text-center">Ligne</div>
              </div>
              <div className="divide-y divide-gray-100">
                {formData.disbursementLines.map((line, index) => (
                  <div key={line.id} className="grid grid-cols-[1.6fr_0.8fr_auto] items-center gap-0">
                    <input
                      type="text"
                      placeholder={`Motif ${index + 1}`}
                      className="border-0 px-4 py-3 text-sm focus:ring-0"
                      value={line.reason}
                      onChange={(e) => updateLine(line.id, 'reason', e.target.value)}
                    />
                    <div className="flex items-center gap-2 border-l border-gray-100 px-4">
                      <span className="text-xs font-semibold text-gray-400">HTG</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="w-full border-0 py-3 text-sm focus:ring-0"
                        value={line.amount}
                        onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-center border-l border-gray-100 px-3">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-agri-green-700 shadow-sm ring-1 ring-agri-green-100 transition hover:bg-agri-green-50"
                >
                  + Ajouter une ligne
                </button>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Total automatique</div>
                  <div className="text-lg font-bold text-agri-dark">{formatMoney(disbursementTotal)} HTG</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateDossier} loading={createMutation.isPending}>
                Créer le dossier
              </Button>
              <Button onClick={() => setIsCreating(false)} variant="ghost">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dossier List */}
      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="shimmer h-48 w-full rounded-2xl" />)
        ) : dossiers.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400">Aucun dossier actif pour le moment.</div>
        ) : (
          dossiers.map((dossier) => (
            <DossierCard
              key={dossier.id}
              dossier={dossier}
              isExpanded={expandedId === dossier.id}
              onToggle={() => setExpandedId(expandedId === dossier.id ? null : dossier.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DossierCard({ dossier, isExpanded, onToggle }: { dossier: Dossier, isExpanded: boolean, onToggle: () => void }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: fullDossier } = useQuery({
    queryKey: ['dossier-detail', dossier.id],
    queryFn: async () => {
      const response = await api.get(`/associates/dossiers/${dossier.id}`);
      return response.data.data;
    },
    enabled: isExpanded,
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.post(`/associates/dossiers/${dossier.id}/comments`, { content: text }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['dossier-detail', dossier.id] });
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/associates/dossiers/${dossier.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document ajouté');
      queryClient.invalidateQueries({ queryKey: ['dossier-detail', dossier.id] });
    } catch {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/associates/dossiers/${dossier.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associate-dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['dossier-detail', dossier.id] });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: (payload: { action: DossierDecision['action']; note?: string }) =>
      api.post(`/associates/dossiers/${dossier.id}/decisions`, payload),
    onSuccess: () => {
      setDecisionNote('');
      toast.success('Décision enregistrée');
      queryClient.invalidateQueries({ queryKey: ['dossier-detail', dossier.id] });
      queryClient.invalidateQueries({ queryKey: ['associate-dossiers'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’enregistrer la décision'),
  });

  const canDecide = user?.associateType === 'PDG' || user?.associateType === 'VOTING';
  const decisions = (fullDossier?.decisions || []) as DossierDecision[];
  const latestDecisions = decisions.reduce((acc, decision) => {
    if (!acc.has(decision.author.id)) acc.set(decision.author.id, decision);
    return acc;
  }, new Map<string, DossierDecision>());
  const latestDecisionList = Array.from(latestDecisions.values());
  const hasApproval = latestDecisionList.some((decision) => decision.action === 'APPROVE');
  const hasBlockingDecision = latestDecisionList.some((decision) => decision.action === 'REJECT' || decision.action === 'REQUEST_CHANGES');

  const handleExport = async () => {
    try {
      const response = await api.get(`/associates/dossiers/${dossier.id}/export`, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/pdf',
        },
      });
      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('application/pdf')) {
        const text = new TextDecoder().decode(new Uint8Array(response.data));
        throw new Error(text || 'Le serveur n’a pas renvoyé un PDF valide.');
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rapport_Dossier_${dossier.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className={`card overflow-hidden transition-all duration-300 ${isExpanded ? 'border-agri-green-500 ring-4 ring-agri-green-50' : 'hover:border-agri-green-200'}`}>
      <div className="p-6 cursor-pointer" onClick={onToggle}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              dossier.status === 'OPEN' ? 'bg-blue-50 text-blue-600' :
              dossier.status === 'COMPLETED' ? 'bg-agri-green-50 text-agri-green-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {dossier.status}
            </span>
            <span className="text-xs text-gray-400">#{dossier.id.slice(0, 8)}</span>
          </div>
          <span className="text-lg">{isExpanded ? '🔼' : '🔽'}</span>
        </div>

        <h4 className="font-display text-2xl text-agri-dark mb-2">{dossier.title}</h4>
        <p className="text-gray-500 text-sm line-clamp-2">{dossier.description}</p>
        {Array.isArray(dossier.disbursementLines) && dossier.disbursementLines.length > 0 && (
          <div className="mt-4 rounded-2xl border border-agri-green-100 bg-agri-green-50/60 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-agri-green-700">Décaissement total</div>
            <div className="mt-1 text-xl font-bold text-agri-dark">
              {formatMoney(Number(dossier.disbursementTotal || 0))} HTG
            </div>
            <div className="mt-2 text-xs font-semibold text-agri-green-700">
              Moyen : {getAccountingChannelLabel(dossier.disbursementMethod)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-6">
          <div className="flex gap-4">
            <div className="text-xs text-gray-400">📂 <b>{dossier._count.documents}</b> docs</div>
            <div className="text-xs text-gray-400">
              🗳️ <b>{dossier.voteBallotsCount ?? 0}</b> votes
              <span className="text-gray-300"> · </span>
              <b>{dossier._count.votes}</b> session{dossier._count.votes > 1 ? 's' : ''}
            </div>
          </div>
          <div className="text-xs font-medium text-agri-green-700">Par {dossier.author.firstName}</div>
        </div>
      </div>

      {isExpanded && fullDossier && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
          {/* Detailed Description */}
          <div>
            <h5 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Description Complète</h5>
            <div className="bg-white p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
              {fullDossier.description}
            </div>
          </div>

          {Array.isArray(fullDossier.disbursementLines) && fullDossier.disbursementLines.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Tableau de décaissement</h5>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="rounded-full bg-agri-green-50 px-4 py-2 text-sm font-bold text-agri-green-700">
                    Total : {formatMoney(Number(fullDossier.disbursementTotal || 0))} HTG
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-agri-dark ring-1 ring-gray-100">
                    Moyen : {getAccountingChannelLabel(fullDossier.disbursementMethod)}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="grid grid-cols-[1.6fr_0.8fr] border-b border-gray-100 bg-gray-50 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  <div className="px-4 py-3">Motif</div>
                  <div className="px-4 py-3 text-right">Montant</div>
                </div>
                {fullDossier.disbursementLines.map((line: any, index: number) => (
                  <div
                    key={`${line.reason}-${index}`}
                    className="grid grid-cols-[1.6fr_0.8fr] border-b border-gray-50 last:border-b-0"
                  >
                    <div className="px-4 py-3 text-sm text-gray-700">{line.reason}</div>
                    <div className="px-4 py-3 text-right text-sm font-semibold text-agri-dark">
                      {formatMoney(Number(line.amount || 0))} HTG
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Documents Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Documents ({fullDossier.documents.length})</h5>
                <label className="text-xs font-bold text-agri-green-600 hover:underline cursor-pointer">
                  {isUploading ? '⏳ Upload...' : '➕ Ajouter un document'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              <div className="space-y-2">
                {fullDossier.documents.length === 0 ? (
                  <div className="text-xs text-gray-400 italic bg-white p-4 rounded-xl border border-dashed border-gray-200 text-center">Aucun document joint.</div>
                ) : (
                  fullDossier.documents.map((doc: any) => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-agri-green-300 transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-lg">📄</span>
                        <span className="text-sm text-gray-700 truncate font-medium">{doc.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-agri-green-600 bg-agri-green-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all">VOIR</span>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Discussions ({fullDossier.comments?.length || 0})</h5>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {fullDossier.comments?.length === 0 ? (
                  <div className="text-xs text-gray-400 italic text-center py-4">Soyez le premier à commenter ce dossier.</div>
                ) : (
                  fullDossier.comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-agri-green-100 flex items-center justify-center text-xs font-bold text-agri-green-700 shrink-0">
                        {c.author.firstName[0]}
                      </div>
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-gray-700">{c.author.firstName} {c.author.lastName}</span>
                          <span className="text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-normal">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border-gray-200 text-xs px-4 py-2"
                  placeholder="Votre commentaire..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commentMutation.mutate(comment)}
                />
                <button
                  onClick={() => commentMutation.mutate(comment)}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="bg-agri-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-agri-green-700 transition-all"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Décisions des associés</h5>
                <p className="mt-1 text-xs text-gray-500">
                  La validation finale du PDG dépend des derniers avis actifs.
                </p>
              </div>
              <div className="text-xs font-semibold text-gray-500">
                {latestDecisionList.length} avis actif(s)
              </div>
            </div>

            {canDecide && dossier.status !== 'COMPLETED' && (
              <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <textarea
                  className="w-full rounded-xl border-gray-200 p-3 text-sm"
                  placeholder="Note optionnelle pour accompagner votre décision..."
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => decisionMutation.mutate({ action: 'APPROVE', note: decisionNote.trim() || undefined })}
                    loading={decisionMutation.isPending}
                  >
                    Approuver
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    onClick={() => decisionMutation.mutate({ action: 'REQUEST_CHANGES', note: decisionNote.trim() || undefined })}
                    loading={decisionMutation.isPending}
                  >
                    Demander correction
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => decisionMutation.mutate({ action: 'REJECT', note: decisionNote.trim() || undefined })}
                    loading={decisionMutation.isPending}
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            )}

            {decisions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
                Aucun avis formel enregistré pour ce dossier.
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((decision) => (
                  <div key={decision.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-bold text-agri-dark">
                          {decision.author.firstName} {decision.author.lastName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {decision.author.associateType || 'ASSOCIATE'} · {new Date(decision.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${decisionStyles[decision.action]}`}>
                        {decisionLabels[decision.action]}
                      </span>
                    </div>
                    {decision.note && <p className="mt-3 text-sm text-gray-600">{decision.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {user?.associateType === 'PDG' && dossier.status !== 'COMPLETED' && (
            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={handleExport}
                className="text-xs font-bold text-gray-500 hover:text-agri-green-600 flex items-center gap-2"
              >
                📥 Exporter en PDF
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => statusMutation.mutate('COMPLETED')}
                loading={statusMutation.isPending}
                disabled={!hasApproval || hasBlockingDecision}
              >
                Valider le dossier
              </Button>
            </div>
          )}
          {(user?.associateType !== 'PDG' || dossier.status === 'COMPLETED') && (
            <div className="pt-6 border-t border-gray-100 flex justify-start">
              <button
                onClick={handleExport}
                className="text-xs font-bold text-gray-500 hover:text-agri-green-600 flex items-center gap-2"
              >
                📥 Exporter en PDF
              </button>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
