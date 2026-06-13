import api from '../api';

export type PosDocumentType = 'RECEIPT' | 'INVOICE' | 'PROFORMA';
export type PosSaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod =
  | 'PLOPPLOP'
  | 'MONCASH'
  | 'CASH'
  | 'CHEQUE'
  | 'VIREMENT_BANCAIRE'
  | 'NATCASH'
  | 'KASHPAW';
export type PosCustomerType = 'WALK_IN' | 'INDIVIDUAL' | 'BUSINESS';

export interface PosSaleItemPayload {
  productId: string;
  productVariantId?: string | null;
  description?: string;
  quantity: number;
}

export interface CreatePosSalePayload {
  documentType: PosDocumentType;
  customerType: PosCustomerType;
  customerName: string;
  companyName?: string | null;
  taxId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  deliveryRequested?: boolean;
  paymentMethod?: PaymentMethod | null;
  discountAmount?: number;
  notes?: string | null;
  items: PosSaleItemPayload[];
}

export interface PosSaleItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  product: {
    name: string;
    images: Array<{ url: string }>;
  };
  productVariant?: {
    id: string;
    label: string;
  } | null;
}

export interface PosSale {
  id: string;
  saleNumber: string;
  documentType: PosDocumentType;
  status: PosSaleStatus;
  customerType: PosCustomerType;
  customerName: string;
  companyName?: string | null;
  taxId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  deliveryRequested?: boolean;
  paymentMethod?: PaymentMethod | null;
  subtotalAmount: number | string;
  discountAmount: number | string;
  deliveryFee: number | string;
  totalAmount: number | string;
  totalWeightLbs?: number | string;
  notes?: string | null;
  createdAt: string;
  items: PosSaleItem[];
  createdBy?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
}

export async function listPosSales(): Promise<PosSale[]> {
  const { data } = await api.get('/pos');
  return data.data;
}

export async function createPosSale(payload: CreatePosSalePayload): Promise<PosSale> {
  const { data } = await api.post('/pos', payload);
  return data.data;
}

export async function getPosSale(id: string): Promise<PosSale> {
  const { data } = await api.get(`/pos/${id}`);
  return data.data;
}

export async function convertPosProformaToInvoice(id: string, paymentMethod: PaymentMethod): Promise<PosSale> {
  const { data } = await api.post(`/pos/${id}/convert-to-invoice`, { paymentMethod });
  return data.data;
}

export async function downloadPosDocument(id: string, type: PosDocumentType): Promise<Blob> {
  const { data } = await api.get(`/pos/${id}/document`, {
    params: { type },
    responseType: 'blob',
  });
  return data;
}
