import api from '../api';

export type DeliveryNoteStatus = 'PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type DeliveryNoteSourceType = 'ORDER' | 'POS_SALE';

export interface DeliveryNoteItemPayload {
  orderItemId?: string;
  posSaleItemId?: string;
  deliveredQuantity: number;
}

export interface CreateDeliveryNotePayload {
  deliveryAgentId?: string | null;
  customerName?: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  status?: DeliveryNoteStatus;
  items: DeliveryNoteItemPayload[];
}

export interface DeliveryNoteItem {
  id: string;
  orderItemId?: string | null;
  posSaleItemId?: string | null;
  description: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  unitWeightLbs: number;
  lineWeightLbs: number;
  product: {
    id: string;
    name: string;
  };
  productVariant?: {
    id: string;
    label: string;
    weightLbs?: number | string;
  } | null;
}

export interface DeliveryNote {
  id: string;
  noteNumber: string;
  sourceType: DeliveryNoteSourceType;
  status: DeliveryNoteStatus;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  receiverName?: string | null;
  receiverSignatureUrl?: string | null;
  notes?: string | null;
  totalQuantity: number;
  totalWeightLbs: number;
  deliveredAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
  posSale?: {
    id: string;
    saleNumber: string;
    documentType: string;
    status: string;
  } | null;
  deliveryAgent?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: string;
  };
  items: DeliveryNoteItem[];
}

export async function createOrderDeliveryNote(orderId: string, payload: CreateDeliveryNotePayload): Promise<DeliveryNote> {
  const { data } = await api.post(`/delivery-notes/orders/${orderId}`, payload);
  return data.data;
}

export async function listOrderDeliveryNotes(orderId: string): Promise<DeliveryNote[]> {
  const { data } = await api.get(`/delivery-notes/orders/${orderId}`);
  return data.data || [];
}

export async function createPosSaleDeliveryNote(posSaleId: string, payload: CreateDeliveryNotePayload): Promise<DeliveryNote> {
  const { data } = await api.post(`/delivery-notes/pos-sales/${posSaleId}`, payload);
  return data.data;
}

export async function listPosSaleDeliveryNotes(posSaleId: string): Promise<DeliveryNote[]> {
  const { data } = await api.get(`/delivery-notes/pos-sales/${posSaleId}`);
  return data.data || [];
}

export async function listMyDeliveryNotes(): Promise<DeliveryNote[]> {
  const { data } = await api.get('/delivery-notes/my');
  return data.data || [];
}

export async function updateDeliveryNoteStatus(
  noteId: string,
  payload: {
    status: DeliveryNoteStatus;
    notes?: string | null;
    receiverName?: string | null;
    receiverSignatureUrl?: string | null;
    receiverSignaturePublicId?: string | null;
  }
): Promise<DeliveryNote> {
  const { data } = await api.patch(`/delivery-notes/${noteId}/status`, payload);
  return data.data;
}

export async function downloadDeliveryNotePdf(noteId: string): Promise<Blob> {
  const { data } = await api.get(`/delivery-notes/${noteId}/document`, {
    responseType: 'blob',
  });
  return data;
}
