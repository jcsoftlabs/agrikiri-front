'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { getMyDeliveryAssignments, updateMyDeliveryStatus } from '@/lib/services/orders';
import {
  createMyDeliveryReport,
  downloadDeliveryReportPdf,
  getMyDeliveryReports,
  type DeliveryAgentReport,
  type DeliveryReportWeightUnit,
} from '@/lib/services/delivery-reports';
import { downloadDeliveryNotePdf, listMyDeliveryNotes, updateDeliveryNoteStatus as updateDeliveryNoteStatusApi } from '@/lib/services/delivery-notes';
import { uploadDeliveryProofAsset } from '@/lib/services/upload';
import Button from '@/components/ui/Button';
import SignaturePad from '@/components/delivery/SignaturePad';
import { ACCOUNTING_CHANNEL_OPTIONS, getAccountingChannelLabel } from '@/lib/accounting-channels';

const DELIVERY_STATUS_LABELS = {
  PROCESSING: 'À récupérer',
  SHIPPED: 'En route',
  DELIVERED: 'Livrée',
  DELIVERY_FAILED: 'Échec',
} as const;

type DeliveryStatus = 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'DELIVERY_FAILED';

interface DeliveryLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface DeliveryProofState {
  recipientName: string;
  note: string;
  photoFile: File | null;
  photoPreview: string | null;
  signatureDataUrl: string | null;
  location: DeliveryLocation | null;
}

interface DeliveryNoteProofState {
  receiverName: string;
  note: string;
  signatureDataUrl: string | null;
}

const initialProofState: DeliveryProofState = {
  recipientName: '',
  note: '',
  photoFile: null,
  photoPreview: null,
  signatureDataUrl: null,
  location: null,
};

const initialDeliveryNoteProofState: DeliveryNoteProofState = {
  receiverName: '',
  note: '',
  signatureDataUrl: null,
};

const LBS_PER_KG = 2.20462;

type ReportLineDraft = {
  deliveryNoteItemId: string;
  description: string;
  orderedQuantity: number;
  assignedQuantity: number;
  alreadyReportedQuantity: number;
  quantity: string;
  unitWeightLbs: number;
};

function formatWeight(value: number, unit: DeliveryReportWeightUnit) {
  const converted = unit === 'KG' ? value / LBS_PER_KG : value;
  const label = unit === 'KG' ? 'Kg' : 'Lbs';
  return `${converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${label}`;
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

async function captureLocation(): Promise<DeliveryLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n’est pas supportée sur cet appareil.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Impossible de récupérer la position.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function DeliveryDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'onroad' | 'failed' | 'done'>('all');
  const [proofOrderId, setProofOrderId] = useState<string | null>(null);
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const [proofDeliveryNoteId, setProofDeliveryNoteId] = useState<string | null>(null);
  const [failureNote, setFailureNote] = useState('');
  const [deliveryProof, setDeliveryProof] = useState<DeliveryProofState>(initialProofState);
  const [deliveryNoteProof, setDeliveryNoteProof] = useState<DeliveryNoteProofState>(initialDeliveryNoteProofState);
  const [reportForm, setReportForm] = useState({
    title: '',
    shiftDate: new Date().toISOString().slice(0, 10),
    summary: '',
    deliveryNoteId: '',
    weightUnit: 'LBS' as DeliveryReportWeightUnit,
    reportItems: [] as ReportLineDraft[],
    totalAssigned: '',
    deliveredCount: '',
    failedCount: '',
    cashCollected: '',
    cashCollectionMethod: 'CASH',
    fieldExpenses: '',
    fieldExpensesMethod: 'CASH',
    incidents: '',
    nextActions: '',
  });

  useEffect(() => {
    if (user && user.role !== 'DELIVERY_AGENT') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-assignments'],
    queryFn: getMyDeliveryAssignments,
    enabled: user?.role === 'DELIVERY_AGENT',
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['delivery-reports-my'],
    queryFn: getMyDeliveryReports,
    enabled: user?.role === 'DELIVERY_AGENT',
  });

  const { data: deliveryNotes = [] } = useQuery({
    queryKey: ['delivery-notes-my'],
    queryFn: listMyDeliveryNotes,
    enabled: user?.role === 'DELIVERY_AGENT',
  });

  const reportedQuantitiesByNoteItem = useMemo(() => {
    return reports.reduce<Record<string, number>>((acc, report: DeliveryAgentReport) => {
      if (!report.deliveryNote?.id) return acc;
      report.reportItems.forEach((item) => {
        const key = `${report.deliveryNote?.id}:${item.deliveryNoteItemId}`;
        acc[key] = (acc[key] || 0) + Number(item.deliveredThisReport || 0);
      });
      return acc;
    }, {});
  }, [reports]);

  const selectedDeliveryNote = useMemo(
    () => deliveryNotes.find((note) => note.id === reportForm.deliveryNoteId) || null,
    [deliveryNotes, reportForm.deliveryNoteId]
  );

  useEffect(() => {
    if (!selectedDeliveryNote) {
      setReportForm((current) => ({
        ...current,
        reportItems: [],
        totalAssigned: '',
        deliveredCount: '',
      }));
      return;
    }

    setReportForm((current) => {
      const existingQuantities = new Map(current.reportItems.map((item) => [item.deliveryNoteItemId, item.quantity]));
      const nextItems = selectedDeliveryNote.items.map((item) => {
        const alreadyReportedQuantity = reportedQuantitiesByNoteItem[`${selectedDeliveryNote.id}:${item.id}`] || 0;
        const remainingAvailable = Math.max(item.deliveredQuantity - alreadyReportedQuantity, 0);
        const previousDraftQuantity = Number(existingQuantities.get(item.id) || 0);
        const safeDraftQuantity = Math.min(previousDraftQuantity, remainingAvailable);

        return {
          deliveryNoteItemId: item.id,
          description: item.description,
          orderedQuantity: item.orderedQuantity,
          assignedQuantity: item.deliveredQuantity,
          alreadyReportedQuantity,
          quantity: safeDraftQuantity > 0 ? String(safeDraftQuantity) : '',
          unitWeightLbs: Number(item.unitWeightLbs || 0),
        };
      });

      return {
        ...current,
        title: current.title || `Rapport ${selectedDeliveryNote.noteNumber}`,
        summary:
          current.summary ||
          `Suivi de livraison pour ${selectedDeliveryNote.customerName} sur le bon ${selectedDeliveryNote.noteNumber}.`,
        reportItems: nextItems,
        totalAssigned: String(selectedDeliveryNote.totalQuantity),
        deliveredCount: String(nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)),
      };
    });
  }, [reportedQuantitiesByNoteItem, selectedDeliveryNote]);

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      note,
      recipientName,
      proofPhotoUrl,
      proofPhotoPublicId,
      signatureUrl,
      signaturePublicId,
      latitude,
      longitude,
      locationAccuracy,
    }: {
      orderId: string;
      status: DeliveryStatus;
      note?: string;
      recipientName?: string;
      proofPhotoUrl?: string;
      proofPhotoPublicId?: string;
      signatureUrl?: string;
      signaturePublicId?: string;
      latitude?: number;
      longitude?: number;
      locationAccuracy?: number;
    }) =>
      updateMyDeliveryStatus(orderId, {
        status,
        note,
        recipientName,
        proofPhotoUrl,
        proofPhotoPublicId,
        signatureUrl,
        signaturePublicId,
        latitude,
        longitude,
        locationAccuracy,
      }),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['delivery-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setProofOrderId(null);
      setFailureOrderId(null);
      setFailureNote('');
      setDeliveryProof(initialProofState);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour cette livraison.');
    },
  });

  const reportMutation = useMutation({
    mutationFn: createMyDeliveryReport,
    onSuccess: () => {
      toast.success('Rapport livreur envoyé');
      queryClient.invalidateQueries({ queryKey: ['delivery-reports-my'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-reports-board'] });
      setReportForm({
        title: '',
        shiftDate: new Date().toISOString().slice(0, 10),
        summary: '',
        deliveryNoteId: '',
        weightUnit: 'LBS',
        reportItems: [],
        totalAssigned: '',
        deliveredCount: '',
        failedCount: '',
        cashCollected: '',
        cashCollectionMethod: 'CASH',
        fieldExpenses: '',
        fieldExpensesMethod: 'CASH',
        incidents: '',
        nextActions: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’envoyer le rapport livreur.');
    },
  });

  const deliveryNoteStatusMutation = useMutation({
    mutationFn: ({
      noteId,
      status,
      receiverName,
      receiverSignatureUrl,
      receiverSignaturePublicId,
      notes,
    }: {
      noteId: string;
      status: 'PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
      receiverName?: string;
      receiverSignatureUrl?: string;
      receiverSignaturePublicId?: string;
      notes?: string;
    }) =>
      updateDeliveryNoteStatusApi(noteId, { status, receiverName, receiverSignatureUrl, receiverSignaturePublicId, notes }),
    onSuccess: () => {
      toast.success('Statut du bon mis à jour');
      queryClient.invalidateQueries({ queryKey: ['delivery-notes-my'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-assignments'] });
      setProofDeliveryNoteId(null);
      setDeliveryNoteProof(initialDeliveryNoteProofState);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour ce bon.');
    },
  });

  const filteredOrders = useMemo(() => {
    if (activeTab === 'pending') return orders.filter((order) => order.status === 'PROCESSING');
    if (activeTab === 'onroad') return orders.filter((order) => order.status === 'SHIPPED');
    if (activeTab === 'failed') return orders.filter((order) => order.status === 'DELIVERY_FAILED');
    if (activeTab === 'done') return orders.filter((order) => order.status === 'DELIVERED');
    return orders;
  }, [activeTab, orders]);

  const counters = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((order) => order.status === 'PROCESSING').length,
      onroad: orders.filter((order) => order.status === 'SHIPPED').length,
      failed: orders.filter((order) => order.status === 'DELIVERY_FAILED').length,
      done: orders.filter((order) => order.status === 'DELIVERED').length,
    }),
    [orders]
  );

  const reportMetrics = useMemo(() => {
    const totalAssigned = selectedDeliveryNote?.totalQuantity || 0;
    const deliveredThisReport = reportForm.reportItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const alreadyReported = reportForm.reportItems.reduce((sum, item) => sum + item.alreadyReportedQuantity, 0);
    const remainingAfterReport = Math.max(totalAssigned - alreadyReported - deliveredThisReport, 0);
    const totalWeightLbs = reportForm.reportItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitWeightLbs || 0),
      0
    );

    return {
      totalAssigned,
      deliveredThisReport,
      alreadyReported,
      remainingAfterReport,
      totalWeightLbs,
      totalWeightKg: totalWeightLbs / LBS_PER_KG,
    };
  }, [reportForm.reportItems, selectedDeliveryNote]);

  const autofillReportFromAssignments = () => {
    const cashOrders = orders.filter((order) => order.paymentMethod === 'CASH' && order.status === 'DELIVERED');
    const cashCollected = cashOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    setReportForm((current) => ({
      ...current,
      title: current.title || `Rapport terrain du ${new Date().toLocaleDateString('fr-FR')}`,
      summary:
        current.summary ||
        (selectedDeliveryNote
          ? `Passage livreur sur ${selectedDeliveryNote.customerName} pour le bon ${selectedDeliveryNote.noteNumber}.`
          : ''),
      reportItems: current.reportItems.map((item) => {
        const remainingAvailable = Math.max(item.assignedQuantity - item.alreadyReportedQuantity, 0);
        return {
          ...item,
          quantity: remainingAvailable > 0 ? String(remainingAvailable) : '',
        };
      }),
      totalAssigned: String(selectedDeliveryNote?.totalQuantity || counters.all),
      deliveredCount: String(
        current.reportItems.reduce((sum, item) => {
          const remainingAvailable = Math.max(item.assignedQuantity - item.alreadyReportedQuantity, 0);
          return sum + remainingAvailable;
        }, 0)
      ),
      failedCount: String(counters.failed),
      cashCollected: String(cashCollected.toFixed(2)),
      cashCollectionMethod: current.cashCollectionMethod || 'CASH',
    }));
    toast.success(
      selectedDeliveryNote
        ? 'Le tableau a été rempli avec le restant livrable de ce bon.'
        : 'Le rapport a été prérempli avec les chiffres actuels.'
    );
  };

  const handleSubmitReport = () => {
    const totalAssigned = selectedDeliveryNote ? reportMetrics.totalAssigned : Number(reportForm.totalAssigned);
    const deliveredCount = selectedDeliveryNote ? reportMetrics.deliveredThisReport : Number(reportForm.deliveredCount);
    const failedCount = Number(reportForm.failedCount);
    const cashCollected = Number(reportForm.cashCollected || '0');
    const fieldExpenses = Number(reportForm.fieldExpenses || '0');

    if (reportForm.title.trim().length < 3) {
      toast.error('Le titre du rapport est requis.');
      return;
    }

    if (reportForm.summary.trim().length < 20) {
      toast.error('Le résumé du rapport est encore trop court.');
      return;
    }

    if (!selectedDeliveryNote) {
      toast.error('Choisis un bon de livraison pour publier ce rapport détaillé.');
      return;
    }

    if (!Number.isFinite(totalAssigned) || totalAssigned < 0) {
      toast.error('Le total assigné doit être valide.');
      return;
    }

    if (!Number.isFinite(deliveredCount) || deliveredCount < 0) {
      toast.error('Le nombre de livraisons réussies doit être valide.');
      return;
    }

    if (!Number.isFinite(failedCount) || failedCount < 0) {
      toast.error('Le nombre d’échecs doit être valide.');
      return;
    }

    if (deliveredCount + failedCount > totalAssigned) {
      toast.error('Les livraisons réussies et échouées dépassent le total assigné.');
      return;
    }

    const reportItemsPayload = reportForm.reportItems
      .map((item) => ({
        deliveryNoteItemId: item.deliveryNoteItemId,
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (reportItemsPayload.length === 0) {
      toast.error('Remplis au moins une ligne livrée dans le tableau.');
      return;
    }

    reportMutation.mutate({
      title: reportForm.title.trim(),
      shiftDate: new Date(`${reportForm.shiftDate}T12:00:00`).toISOString(),
      summary: reportForm.summary.trim(),
      deliveryNoteId: selectedDeliveryNote.id,
      weightUnit: reportForm.weightUnit,
      reportItems: reportItemsPayload,
      totalAssigned,
      deliveredCount,
      failedCount,
      cashCollected,
      cashCollectionMethod: reportForm.cashCollectionMethod as any,
      fieldExpenses,
      fieldExpensesMethod: reportForm.fieldExpensesMethod as any,
      incidents: reportForm.incidents.trim() || undefined,
      nextActions: reportForm.nextActions.trim() || undefined,
    });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDeliveryProof((current) => ({
      ...current,
      photoFile: file,
      photoPreview: URL.createObjectURL(file),
    }));
  };

  const handleCaptureLocation = async () => {
    try {
      const location = await captureLocation();
      setDeliveryProof((current) => ({ ...current, location }));
      toast.success('Position capturée');
    } catch (error: any) {
      toast.error(error.message || 'Impossible de capturer la position.');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!proofOrderId) return;

    if (!deliveryProof.recipientName.trim()) {
      toast.error('Le nom du destinataire est requis.');
      return;
    }

    if (!deliveryProof.photoFile) {
      toast.error('Ajoute une photo de livraison.');
      return;
    }

    if (!deliveryProof.signatureDataUrl) {
      toast.error('La signature du destinataire est requise.');
      return;
    }

    if (!deliveryProof.location) {
      toast.error('Capture la géolocalisation avant de confirmer.');
      return;
    }

    try {
      const signatureFile = dataUrlToFile(
        deliveryProof.signatureDataUrl,
        `signature-${proofOrderId}.png`
      );

      const [photoAsset, signatureAsset] = await Promise.all([
        uploadDeliveryProofAsset(deliveryProof.photoFile),
        uploadDeliveryProofAsset(signatureFile),
      ]);

      statusMutation.mutate({
        orderId: proofOrderId,
        status: 'DELIVERED',
        note: deliveryProof.note.trim() || undefined,
        recipientName: deliveryProof.recipientName.trim(),
        proofPhotoUrl: photoAsset.url,
        proofPhotoPublicId: photoAsset.publicId,
        signatureUrl: signatureAsset.url,
        signaturePublicId: signatureAsset.publicId,
        latitude: deliveryProof.location.latitude,
        longitude: deliveryProof.location.longitude,
        locationAccuracy: deliveryProof.location.accuracy,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de préparer la preuve de livraison.');
    }
  };

  const currentProofOrder = orders.find((order) => order.id === proofOrderId) || null;
  const currentFailureOrder = orders.find((order) => order.id === failureOrderId) || null;
  const currentProofDeliveryNote = deliveryNotes.find((note) => note.id === proofDeliveryNoteId) || null;
  const urgentOrders = orders.filter((order) => order.status === 'PROCESSING' || order.status === 'SHIPPED');

  const handleDownloadDeliveryNote = async (noteId: string, noteNumber: string) => {
    try {
      const blob = await downloadDeliveryNotePdf(noteId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bon-livraison-${noteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Bon de livraison téléchargé.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce bon.');
    }
  };

  const handleDownloadDeliveryReport = async (reportId: string) => {
    try {
      const blob = await downloadDeliveryReportPdf(reportId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-livreur-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Rapport PDF téléchargé.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce rapport.');
    }
  };

  const handleConfirmDeliveryNote = async () => {
    if (!proofDeliveryNoteId) return;

    if (!deliveryNoteProof.receiverName.trim()) {
      toast.error('Le nom du receveur est requis.');
      return;
    }

    if (!deliveryNoteProof.signatureDataUrl) {
      toast.error('La signature du receveur est requise.');
      return;
    }

    try {
      const signatureFile = dataUrlToFile(
        deliveryNoteProof.signatureDataUrl,
        `delivery-note-signature-${proofDeliveryNoteId}.png`
      );
      const signatureAsset = await uploadDeliveryProofAsset(signatureFile);

      deliveryNoteStatusMutation.mutate({
        noteId: proofDeliveryNoteId,
        status: 'DELIVERED',
        receiverName: deliveryNoteProof.receiverName.trim(),
        receiverSignatureUrl: signatureAsset.url,
        receiverSignaturePublicId: signatureAsset.publicId,
        notes: deliveryNoteProof.note.trim() || undefined,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de préparer la preuve de réception du bon.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f1]">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Livraison AGRIKIRI</p>
            <h1 className="font-display text-2xl text-agri-dark">Mes livraisons</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700"
            >
              Mon profil
            </Link>
            <button
              onClick={logout}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-agri-green-800 to-agri-green-600 text-white shadow-[0_24px_70px_rgba(24,50,34,0.18)]">
          <div className="p-5 md:p-6">
            <div className="text-sm text-white/70">Livreur connecté</div>
            <div className="mt-1 text-2xl font-semibold">{user ? `${user.firstName} ${user.lastName}` : 'Livreur'}</div>
            {user?.phone && <div className="mt-1 text-sm text-white/75">{user.phone}</div>}
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-3">
            <div className="bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">À traiter</div>
              <div className="mt-1 text-3xl font-bold text-white">{urgentOrders.length}</div>
            </div>
            <div className="bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">En route</div>
              <div className="mt-1 text-3xl font-bold text-white">{counters.onroad}</div>
            </div>
            <div className="bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Livrées</div>
              <div className="mt-1 text-3xl font-bold text-white">{counters.done}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: 'all', label: 'Toutes', value: counters.all },
            { key: 'pending', label: 'À récupérer', value: counters.pending },
            { key: 'onroad', label: 'En route', value: counters.onroad },
            { key: 'failed', label: 'Échecs', value: counters.failed },
            { key: 'done', label: 'Livrées', value: counters.done },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                activeTab === tab.key
                  ? 'border-agri-green-600 bg-agri-green-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <div className="text-xs uppercase tracking-wide opacity-80">{tab.label}</div>
              <div className="text-2xl font-bold mt-1">{tab.value}</div>
            </button>
          ))}
        </div>

        <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Vue globale</p>
              <h2 className="font-display text-3xl text-agri-dark mt-2">Mes commandes assignées</h2>
              <p className="text-sm text-gray-500 mt-2">
                Retrouvez d’abord toutes les commandes qui vous sont confiées, puis utilisez les bons de livraison pour suivre chaque passage en détail.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Commandes actives</div>
              <div className="mt-1 text-xl font-bold text-agri-dark">{orders.length}</div>
            </div>
          </div>

          <div className="mt-5">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="shimmer h-56 w-full rounded-3xl" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
            {orders.length === 0
              ? 'Aucune livraison ne vous est encore assignée pour le moment.'
              : 'Aucune livraison ne correspond à ce filtre pour le moment.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const phone = `${order.deliveryAddress?.phoneCountryCode || ''}${order.deliveryAddress?.phoneNumber || ''}`;
              const alreadyDelivered = order.status === 'DELIVERED';
              const mapsQuery = [
                order.deliveryAddress?.addressLine1,
                order.deliveryAddress?.addressLine2,
                order.deliveryAddress?.city,
                order.deliveryAddress?.stateRegion,
                order.deliveryAddress?.countryCode,
              ]
                .filter(Boolean)
                .join(', ');
              const mapsHref = mapsQuery
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
                : undefined;
              return (
                <div key={order.id} className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
                  <div className="border-b border-gray-100 bg-[linear-gradient(135deg,#fafcf7_0%,#f3f8ee_100%)] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-gray-400">{order.orderNumber}</div>
                      <h2 className="font-semibold text-2xl text-agri-dark mt-2">
                        {order.deliveryAddress?.fullName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()}
                      </h2>
                      <div className="mt-3 text-base text-gray-600 leading-relaxed">
                        {order.deliveryAddress?.addressLine1}
                        {order.deliveryAddress?.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ''}
                      </div>
                      <div className="text-base text-gray-500">
                        {order.deliveryAddress?.city}, {order.deliveryAddress?.stateRegion}
                      </div>
                      {order.deliveryZone && <div className="mt-2 text-sm font-semibold text-agri-green-700">Zone: {order.deliveryZone}</div>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-50 text-green-700'
                          : order.status === 'DELIVERY_FAILED'
                            ? 'bg-orange-50 text-orange-700'
                            : order.status === 'SHIPPED'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {DELIVERY_STATUS_LABELS[order.status as keyof typeof DELIVERY_STATUS_LABELS] || order.status}
                    </span>
                  </div>
                  </div>

                  <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-gray-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Montant</div>
                      <div className="mt-1 text-xl font-bold text-agri-dark">{order.totalAmount.toLocaleString()} HTG</div>
                    </div>
                    <div className="rounded-[22px] bg-gray-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Paiement</div>
                      <div className="mt-1 text-xl font-bold text-agri-dark">
                        {order.paymentMethod === 'CASH'
                          ? order.paymentStatus === 'PARTIALLY_PAID'
                            ? 'Partiellement encaissé'
                            : order.paymentStatus === 'PAID'
                              ? 'Total encaissé'
                              : 'À encaisser'
                          : order.paymentStatus}
                      </div>
                    </div>
                  </div>

                  {order.paymentMethod === 'CASH' && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-[22px] bg-emerald-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-emerald-700/70">Déjà encaissé</div>
                        <div className="mt-1 text-xl font-bold text-emerald-900">
                          {(order.amountCollected ?? 0).toLocaleString()} HTG
                        </div>
                      </div>
                      <div className="rounded-[22px] bg-amber-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-amber-700/70">Reste à encaisser</div>
                        <div className="mt-1 text-xl font-bold text-amber-900">
                          {(order.amountRemaining ?? Math.max(0, order.totalAmount - (order.amountCollected ?? 0))).toLocaleString()} HTG
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4">
                    <div className="rounded-[24px] border border-agri-green-100 bg-agri-green-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-agri-green-700">Action rapide</div>
                      <div className="mt-2 text-sm text-agri-green-900">
                        {order.status === 'PROCESSING'
                          ? 'Récupérez la commande puis marquez-la en route.'
                          : order.status === 'SHIPPED'
                            ? 'Confirmez la livraison ou signalez un échec avec une note.'
                            : order.status === 'DELIVERY_FAILED'
                              ? 'Reprenez cette livraison si une nouvelle tentative est prévue.'
                              : 'Cette livraison est terminée.'}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-gray-100 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Contact client</div>
                      <div className="mt-2 text-lg font-semibold text-agri-dark">
                        {order.deliveryAddress?.phoneCountryCode} {order.deliveryAddress?.phoneNumber}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 xl:grid-cols-6 gap-3">
                    <a
                      href={phone ? `tel:${phone}` : undefined}
                      className={`rounded-[22px] px-4 py-5 text-center font-semibold text-base ${phone ? 'bg-agri-green-50 text-agri-green-700 border border-agri-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200 pointer-events-none'}`}
                    >
                      Appeler
                    </a>
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-[22px] px-4 py-5 text-center font-semibold text-base ${mapsHref ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-gray-100 text-gray-400 border border-gray-200 pointer-events-none'}`}
                    >
                      Maps
                    </a>
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded-[22px] border border-gray-200 bg-white px-4 py-5 text-center text-base font-semibold text-gray-700"
                    >
                      Détails
                    </Link>
                    <Button
                      variant="secondary"
                      className="!rounded-[22px] !py-5 !text-base"
                      disabled={order.status === 'SHIPPED' || alreadyDelivered || statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ orderId: order.id, status: 'SHIPPED' })}
                    >
                      En route
                    </Button>
                    <Button
                      variant="ghost"
                      className="!rounded-[22px] !py-5 !text-base"
                      disabled={alreadyDelivered || statusMutation.isPending}
                      onClick={() => {
                        setFailureOrderId(order.id);
                        setFailureNote('');
                      }}
                    >
                      Échec
                    </Button>
                    <Button
                      variant="primary"
                      className="!rounded-[22px] !py-5 !text-base"
                      disabled={alreadyDelivered || statusMutation.isPending}
                      onClick={() => {
                        setProofOrderId(order.id);
                        setDeliveryProof({
                          ...initialProofState,
                          recipientName: order.deliveryAddress?.fullName || '',
                        });
                      }}
                    >
                      Livrée
                    </Button>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Chargements réels</p>
              <h2 className="font-display text-3xl text-agri-dark mt-2">Mes bons de livraison</h2>
              <p className="text-sm text-gray-500 mt-2">
                Chaque bon détaille ce que vous transportez réellement sur un passage précis, avec quantités, poids et restant.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Bons actifs</div>
              <div className="mt-1 text-xl font-bold text-agri-dark">
                {deliveryNotes.filter((note) => note.status !== 'CANCELLED').length}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {deliveryNotes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                Aucun bon de livraison ne vous est encore assigné.
              </div>
            ) : (
              deliveryNotes.map((note) => (
                <div key={note.id} className="rounded-[26px] border border-gray-100 bg-[#fbfaf7] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          note.status === 'DELIVERED'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : note.status === 'IN_TRANSIT'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : note.status === 'CANCELLED'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {note.status === 'PREPARED' ? 'Préparé' : note.status === 'IN_TRANSIT' ? 'En transit' : note.status === 'DELIVERED' ? 'Livré' : 'Annulé'}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {note.noteNumber}
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-agri-dark">{note.customerName}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {note.customerAddress || 'Adresse non renseignée'}
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-[24px] border border-agri-green-100 bg-agri-green-50 px-4 py-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-agri-green-700/70">Source</div>
                          <div className="mt-2 text-lg font-bold text-agri-dark">
                            {note.sourceType === 'ORDER' ? note.order?.orderNumber || 'Commande' : note.posSale?.saleNumber || 'POS'}
                          </div>
                          <div className="mt-1 text-xs text-agri-green-800/80">
                            {note.sourceType === 'ORDER' ? 'Commande client' : 'Vente comptoir / POS'}
                          </div>
                        </div>
                        <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-sky-700/70">Chargement du passage</div>
                          <div className="mt-2 text-3xl font-bold text-agri-dark">{note.totalQuantity}</div>
                          <div className="mt-1 text-xs text-sky-900/75">unités à transporter sur ce bon</div>
                        </div>
                        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700/70">Poids total</div>
                          <div className="mt-2 text-3xl font-bold text-agri-dark">
                            {Number(note.totalWeightLbs).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lbs
                          </div>
                          <div className="mt-1 text-xs text-amber-900/75">charge estimée du véhicule</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Lignes</div>
                          <div className="mt-1 font-semibold text-agri-dark">{note.items.length}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Reste total</div>
                          <div className="mt-1 font-semibold text-agri-dark">
                            {note.items.reduce((sum, item) => sum + item.remainingQuantity, 0)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Créé le</div>
                          <div className="mt-1 font-semibold text-agri-dark">
                            {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        {note.receiverName && (
                          <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2 sm:col-span-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Receveur confirmé</div>
                            <div className="mt-1 font-semibold text-agri-dark">{note.receiverName}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Button type="button" variant="secondary" onClick={() => handleDownloadDeliveryNote(note.id, note.noteNumber)}>
                        Télécharger le bon
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={note.status !== 'PREPARED' || deliveryNoteStatusMutation.isPending}
                        onClick={() => deliveryNoteStatusMutation.mutate({ noteId: note.id, status: 'IN_TRANSIT' })}
                      >
                        Marquer en transit
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={note.status === 'DELIVERED' || note.status === 'CANCELLED' || deliveryNoteStatusMutation.isPending}
                        onClick={() => {
                          setProofDeliveryNoteId(note.id);
                          setDeliveryNoteProof({
                            receiverName: note.receiverName || note.customerName || '',
                            note: note.notes || '',
                            signatureDataUrl: null,
                          });
                        }}
                      >
                        Marquer livré
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                          <th className="pb-2 pr-4">Produit</th>
                          <th className="pb-2 pr-4">Cmd</th>
                          <th className="pb-2 pr-4">Ce passage</th>
                          <th className="pb-2 pr-4">Reste</th>
                          <th className="pb-2 pr-4">Poids U.</th>
                          <th className="pb-2">Poids ligne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {note.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-100 text-gray-600">
                            <td className="py-3 pr-4 font-medium text-agri-dark">{item.description}</td>
                            <td className="py-3 pr-4">{item.orderedQuantity}</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex rounded-full bg-agri-green-50 px-2.5 py-1 font-semibold text-agri-green-700">
                                {item.deliveredQuantity}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                {item.remainingQuantity}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{Number(item.unitWeightLbs).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lbs</td>
                            <td className="py-3 font-semibold text-agri-dark">{Number(item.lineWeightLbs).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lbs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Rapport terrain</p>
                <h2 className="font-display text-3xl text-agri-dark mt-2">Publier mon rapport livreur</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Ce rapport sera automatiquement visible par les associés dans leur dashboard.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={autofillReportFromAssignments}>
                Préremplir avec mes chiffres
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Titre</label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Ex: Tournée Delmas / Pétion-Ville"
                  value={reportForm.title}
                  onChange={(event) => setReportForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Date du rapport</label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.shiftDate}
                  onChange={(event) => setReportForm((current) => ({ ...current, shiftDate: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Résumé</label>
                <textarea
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Décris comment la tournée s’est passée, les zones couvertes, les blocages et les résultats globaux."
                  value={reportForm.summary}
                  onChange={(event) => setReportForm((current) => ({ ...current, summary: event.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-agri-green-100 bg-[#f8fbf5] p-4">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <label className="block text-sm font-semibold text-agri-dark mb-2">Bon de livraison à rapporter</label>
                  <select
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                    value={reportForm.deliveryNoteId}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        deliveryNoteId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choisir un bon assigné</option>
                    {deliveryNotes
                      .filter((note) => note.status !== 'CANCELLED')
                      .map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.noteNumber} · {note.customerName}
                        </option>
                      ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Choisissez le bon concerné, renseignez uniquement les quantités livrées dans ce rapport, puis
                    revenez sur le même bon tant qu’il n’est pas totalement soldé.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-agri-dark mb-2">Unité de poids</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['LBS', 'KG'] as DeliveryReportWeightUnit[]).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setReportForm((current) => ({ ...current, weightUnit: unit }))}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          reportForm.weightUnit === unit
                            ? 'border-agri-green-600 bg-agri-green-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {unit === 'KG' ? 'Kilogrammes' : 'Livres (Lbs)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!selectedDeliveryNote ? (
                <div className="mt-4 rounded-3xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Choisissez un bon de livraison pour afficher le tableau des produits, les totaux et le restant.
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Assigné sur bon</div>
                      <div className="mt-2 text-2xl font-bold text-agri-dark">{reportMetrics.totalAssigned}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Déjà rapporté</div>
                      <div className="mt-2 text-2xl font-bold text-agri-dark">{reportMetrics.alreadyReported}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Cette fois</div>
                      <div className="mt-2 text-2xl font-bold text-agri-green-700">{reportMetrics.deliveredThisReport}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Reste après rapport</div>
                      <div className="mt-2 text-2xl font-bold text-amber-700">{reportMetrics.remainingAfterReport}</div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-[24px] border border-white bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#f7f6f1]">
                        <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Assigné</th>
                          <th className="px-4 py-3">Déjà rapporté</th>
                          <th className="px-4 py-3">Quantité livrée maintenant</th>
                          <th className="px-4 py-3">Poids</th>
                          <th className="px-4 py-3">Reste après</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportForm.reportItems.map((item) => {
                          const currentQuantity = Number(item.quantity || 0);
                          const remainingAvailable = Math.max(item.assignedQuantity - item.alreadyReportedQuantity, 0);
                          const remainingAfter = Math.max(remainingAvailable - currentQuantity, 0);
                          return (
                            <tr key={item.deliveryNoteItemId} className="border-t border-gray-100 align-top">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-agri-dark">{item.description}</div>
                                <div className="mt-1 text-xs text-gray-500">Commande totale: {item.orderedQuantity}</div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-agri-dark">{item.assignedQuantity}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                                  {item.alreadyReportedQuantity}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={remainingAvailable}
                                  className="w-28 rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-agri-green-500"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    setReportForm((current) => ({
                                      ...current,
                                      reportItems: current.reportItems.map((line) =>
                                        line.deliveryNoteItemId === item.deliveryNoteItemId
                                          ? {
                                              ...line,
                                              quantity: event.target.value,
                                            }
                                          : line
                                      ),
                                    }))
                                  }
                                />
                                <div className="mt-1 text-xs text-gray-500">Max dispo: {remainingAvailable}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-agri-dark">
                                  {formatWeight(currentQuantity * item.unitWeightLbs, reportForm.weightUnit)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  U.: {formatWeight(item.unitWeightLbs, reportForm.weightUnit)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                  {remainingAfter}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t border-gray-100 bg-[#fbfaf6]">
                        <tr className="font-semibold text-agri-dark">
                          <td className="px-4 py-3">Totaux</td>
                          <td className="px-4 py-3">{reportMetrics.totalAssigned}</td>
                          <td className="px-4 py-3">{reportMetrics.alreadyReported}</td>
                          <td className="px-4 py-3 text-agri-green-700">{reportMetrics.deliveredThisReport}</td>
                          <td className="px-4 py-3">{formatWeight(reportMetrics.totalWeightLbs, reportForm.weightUnit)}</td>
                          <td className="px-4 py-3 text-amber-700">{reportMetrics.remainingAfterReport}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    Quantité restante sur ce bon après ce rapport :
                    <span className="ml-2 font-bold">{reportMetrics.remainingAfterReport}</span>
                    <span className="ml-3 text-amber-800/80">
                      ({reportMetrics.totalAssigned} assignées - {reportMetrics.alreadyReported + reportMetrics.deliveredThisReport} déjà rapportées)
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Échecs / anomalies sur ce passage</label>
                <input
                  type="number"
                  step="1"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.failedCount}
                  onChange={(event) => setReportForm((current) => ({ ...current, failedCount: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Cash collecté (HTG)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.cashCollected}
                  onChange={(event) => setReportForm((current) => ({ ...current, cashCollected: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Frais terrain (HTG)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.fieldExpenses}
                  onChange={(event) => setReportForm((current) => ({ ...current, fieldExpenses: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Moyen du cash collecté</label>
                <select
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.cashCollectionMethod}
                  onChange={(event) => setReportForm((current) => ({ ...current, cashCollectionMethod: event.target.value }))}
                >
                  {ACCOUNTING_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Moyen utilisé pour les frais</label>
                <select
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={reportForm.fieldExpensesMethod}
                  onChange={(event) => setReportForm((current) => ({ ...current, fieldExpensesMethod: event.target.value }))}
                >
                  {ACCOUNTING_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Bilan rapide</label>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Restant terrain net :{' '}
                  <span className="font-bold text-agri-dark">
                    {(
                      Number(reportForm.cashCollected || '0') - Number(reportForm.fieldExpenses || '0')
                    ).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Incidents rencontrés</label>
                <textarea
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Client absent, zone difficile, embouteillage, problème d’adresse..."
                  value={reportForm.incidents}
                  onChange={(event) => setReportForm((current) => ({ ...current, incidents: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Prochaines actions</label>
                <textarea
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Nouvelle tentative, retour client, vérification d’adresse, collecte prévue..."
                  value={reportForm.nextActions}
                  onChange={(event) => setReportForm((current) => ({ ...current, nextActions: event.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" variant="primary" loading={reportMutation.isPending} onClick={handleSubmitReport}>
                Publier le rapport
              </Button>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Historique</p>
            <h2 className="font-display text-3xl text-agri-dark mt-2">Mes derniers rapports</h2>

            <div className="mt-5 space-y-4">
              {reports.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                  Aucun rapport livreur n’a encore été envoyé.
                </div>
              ) : (
                reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                      {new Date(report.shiftDate).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-agri-dark">{report.title}</div>
                    <p className="mt-2 text-sm text-gray-500 line-clamp-3">{report.summary}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Quantité livrée</div>
                        <div className="mt-1 font-semibold text-agri-dark">{report.deliveredCount}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Poids total</div>
                        <div className="mt-1 font-semibold text-agri-dark">
                          {formatWeight(Number(report.totalDeliveredWeightLbs), report.weightUnit)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Cash</div>
                        <div className="mt-1 font-semibold text-agri-dark">
                          {Number(report.cashCollected).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Reste</div>
                        <div className="mt-1 font-semibold text-agri-dark">{report.remainingAssigned}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Moyen entrée</div>
                        <div className="mt-1 font-semibold text-agri-dark">{getAccountingChannelLabel(report.cashCollectionMethod)}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Moyen frais</div>
                        <div className="mt-1 font-semibold text-agri-dark">{getAccountingChannelLabel(report.fieldExpensesMethod)}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Bon</div>
                        <div className="mt-1 font-semibold text-agri-dark">{report.deliveryNote?.noteNumber || 'Hors bon'}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button type="button" variant="secondary" onClick={() => handleDownloadDeliveryReport(report.id)}>
                        Télécharger le rapport PDF
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {proofDeliveryNoteId && currentProofDeliveryNote && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto max-w-2xl rounded-[28px] bg-[#f6f4ee] shadow-2xl border border-white/40">
            <div className="p-5 md:p-7 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-agri-green-600 font-semibold">Preuve du bon livré</p>
                <h2 className="font-display text-3xl text-agri-dark mt-2">{currentProofDeliveryNote.noteNumber}</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Indique le nom de la personne qui a réellement reçu la marchandise, puis capture sa signature pour le PDF du bon.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProofDeliveryNoteId(null);
                  setDeliveryNoteProof(initialDeliveryNoteProofState);
                }}
                className="rounded-full bg-white px-3 py-2 text-gray-500 border border-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:p-7 space-y-6">
              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Nom du receveur</label>
                <input
                  value={deliveryNoteProof.receiverName}
                  onChange={(event) =>
                    setDeliveryNoteProof((current) => ({ ...current, receiverName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Nom de la personne qui a réceptionné la marchandise"
                />
              </div>

              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Note de remise</label>
                <textarea
                  value={deliveryNoteProof.note}
                  onChange={(event) =>
                    setDeliveryNoteProof((current) => ({ ...current, note: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Précision éventuelle sur la remise"
                />
              </div>

              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Signature du receveur</label>
                <SignaturePad
                  onChange={(value) =>
                    setDeliveryNoteProof((current) => ({ ...current, signatureDataUrl: value }))
                  }
                />
              </div>
            </div>

            <div className="p-5 md:p-7 border-t border-gray-200 flex flex-col-reverse md:flex-row md:justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProofDeliveryNoteId(null);
                  setDeliveryNoteProof(initialDeliveryNoteProofState);
                }}
              >
                Annuler
              </Button>
              <Button type="button" variant="primary" loading={deliveryNoteStatusMutation.isPending} onClick={handleConfirmDeliveryNote}>
                Confirmer la remise
              </Button>
            </div>
          </div>
        </div>
      )}

      {proofOrderId && currentProofOrder && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto max-w-3xl rounded-[28px] bg-[#f6f4ee] shadow-2xl border border-white/40">
            <div className="p-5 md:p-7 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-agri-green-600 font-semibold">Preuve de livraison</p>
                <h2 className="font-display text-3xl text-agri-dark mt-2">{currentProofOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Confirme la remise au destinataire avec photo, signature et position.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProofOrderId(null);
                  setDeliveryProof(initialProofState);
                }}
                className="rounded-full bg-white px-3 py-2 text-gray-500 border border-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:p-7 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-4 border border-gray-100">
                  <label className="block text-sm font-semibold text-agri-dark mb-2">Destinataire</label>
                  <input
                    value={deliveryProof.recipientName}
                    onChange={(event) =>
                      setDeliveryProof((current) => ({ ...current, recipientName: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                    placeholder="Nom de la personne qui reçoit"
                  />
                </div>
                <div className="rounded-3xl bg-white p-4 border border-gray-100">
                  <label className="block text-sm font-semibold text-agri-dark mb-2">Géolocalisation</label>
                  <div className="space-y-3">
                    <Button variant="secondary" size="lg" type="button" onClick={handleCaptureLocation}>
                      Capturer ma position
                    </Button>
                    {deliveryProof.location ? (
                      <div className="text-sm text-gray-600">
                        <div>{deliveryProof.location.latitude.toFixed(5)}, {deliveryProof.location.longitude.toFixed(5)}</div>
                        {deliveryProof.location.accuracy ? (
                          <div className="text-xs text-gray-400 mt-1">
                            Précision estimée : {Math.round(deliveryProof.location.accuracy)} m
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Aucune position capturée pour le moment.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Photo de livraison</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-agri-green-50 file:px-4 file:py-2 file:font-semibold file:text-agri-green-700"
                />
                {deliveryProof.photoPreview && (
                  <div className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-[#faf9f4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deliveryProof.photoPreview}
                      alt="Preuve de livraison"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Signature du destinataire</label>
                <SignaturePad
                  onChange={(value) =>
                    setDeliveryProof((current) => ({ ...current, signatureDataUrl: value }))
                  }
                />
              </div>

              <div className="rounded-3xl bg-white p-4 border border-gray-100">
                <label className="block text-sm font-semibold text-agri-dark mb-2">Note de livraison</label>
                <textarea
                  rows={4}
                  value={deliveryProof.note}
                  onChange={(event) =>
                    setDeliveryProof((current) => ({ ...current, note: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Ex: livré au portail principal, reçu par un proche, etc."
                />
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-gray-200 bg-[#f6f4ee]/95 p-5 backdrop-blur md:-mx-7 md:-mb-7 md:px-7">
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setProofOrderId(null);
                    setDeliveryProof(initialProofState);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={statusMutation.isPending}
                  onClick={handleConfirmDelivery}
                >
                  Confirmer la livraison
                </Button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {failureOrderId && currentFailureOrder && (
        <div className="fixed inset-0 z-50 bg-black/35 p-4">
          <div className="mx-auto max-w-xl rounded-[28px] bg-white border border-gray-100 shadow-2xl p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-orange-600 font-semibold">Échec de livraison</p>
              <h2 className="font-display text-3xl text-agri-dark mt-2">{currentFailureOrder.orderNumber}</h2>
              <p className="text-sm text-gray-500 mt-2">
                Ajoute une note claire pour que l’admin et le client comprennent ce qu’il s’est passé.
              </p>
            </div>
            <textarea
              rows={4}
              value={failureNote}
              onChange={(event) => setFailureNote(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ex: client absent, téléphone injoignable, adresse introuvable..."
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setFailureOrderId(null)}>
                Fermer
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    orderId: failureOrderId,
                    status: 'DELIVERY_FAILED',
                    note: failureNote.trim() || undefined,
                  })
                }
              >
                Confirmer l’échec
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
