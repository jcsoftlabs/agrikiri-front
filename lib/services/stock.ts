import api from '../api';

export interface StockProductVariantOption {
  id: string;
  label: string;
  stockQuantity: number;
  weightLbs: number;
}

export interface StockProductOption {
  id: string;
  name: string;
  stockQuantity: number;
  weightLbs: number;
  category?: {
    id: string;
    name: string;
  };
  variants: StockProductVariantOption[];
}

export interface BuyerStockShipmentItem {
  productId: string;
  productVariantId?: string | null;
  description: string;
  quantity: number;
  unitWeightLbs: number;
  lineWeightLbs: number;
  shipmentId?: string;
  shipmentTitle?: string;
  buyerName?: string;
}

export interface BuyerStockShipment {
  id: string;
  title: string;
  notes?: string | null;
  status: 'PENDING_RECEIPT' | 'RECEIVED';
  totalQuantity: number;
  totalWeightLbs: number;
  receivedAt?: string | null;
  reportedInStockReportId?: string | null;
  createdAt: string;
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  receivedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  items: BuyerStockShipmentItem[];
}

export interface StockReport {
  id: string;
  title: string;
  reportDate: string;
  summary?: string | null;
  buyerReceiptItems: BuyerStockShipmentItem[];
  buyerReceiptTotalQuantity: number;
  buyerReceiptTotalWeightLbs: number;
  stockOutputItems: BuyerStockShipmentItem[];
  stockOutputTotalQuantity: number;
  stockOutputTotalWeightLbs: number;
  productionInputItems: BuyerStockShipmentItem[];
  productionInputTotalQuantity: number;
  productionOrderOutputItems: BuyerStockShipmentItem[];
  productionOrderOutputTotalQuantity: number;
  stockManager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  linkedShipments: Array<{
    id: string;
    title: string;
    buyer: {
      firstName: string;
      lastName: string;
    };
  }>;
  createdAt: string;
}

export interface StockDashboardResponse {
  overview: {
    pendingShipments: number;
    receivedShipments: number;
    lowStockProducts: number;
    assignableOrders: number;
    assignablePosSales: number;
  };
  shipments: BuyerStockShipment[];
  reports: StockReport[];
  deliveryAgents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email: string;
  }>;
  orders: any[];
  posSales: any[];
  products: StockProductOption[];
}

export interface StockBoardReportsResponse {
  overview: {
    totalReports: number;
    totalBuyerReceiptQuantity: number;
    totalBuyerReceiptWeightLbs: number;
    totalStockOutputQuantity: number;
    totalProductionInputQuantity: number;
    totalProductionOrderOutputQuantity: number;
  };
  reports: StockReport[];
}

export interface CreateBuyerStockShipmentPayload {
  title: string;
  notes?: string;
  items: Array<{
    productId: string;
    productVariantId?: string;
    quantity: number;
  }>;
}

export interface CreateStockReportPayload {
  title: string;
  reportDate: string;
  summary?: string;
  buyerShipmentIds: string[];
  stockOutputItems: Array<{ productId: string; productVariantId?: string; quantity: number }>;
  productionInputItems: Array<{ productId: string; productVariantId?: string; quantity: number }>;
  productionOrderOutputItems: Array<{ productId: string; productVariantId?: string; quantity: number }>;
}

export async function getStockDashboard(): Promise<StockDashboardResponse> {
  const { data } = await api.get('/stock/dashboard');
  return data.data;
}

export async function createBuyerStockShipment(payload: CreateBuyerStockShipmentPayload): Promise<BuyerStockShipment> {
  const { data } = await api.post('/stock/buyer-shipments', payload);
  return data.data;
}

export async function getMyBuyerStockShipments(): Promise<BuyerStockShipment[]> {
  const { data } = await api.get('/stock/buyer-shipments/my');
  return data.data || [];
}

export async function confirmBuyerStockShipment(id: string): Promise<BuyerStockShipment> {
  const { data } = await api.post(`/stock/buyer-shipments/${id}/confirm`);
  return data.data;
}

export async function updateStockQuantity(payload: {
  productId: string;
  productVariantId?: string;
  stockQuantity: number;
}) {
  const { data } = await api.patch('/stock/quantities', payload);
  return data.data;
}

export async function assignOrderToDelivery(orderId: string, payload: {
  deliveryAgentId: string;
  deliveryZone?: string;
  estimatedDeliveryDate?: string;
}) {
  const { data } = await api.patch(`/stock/orders/${orderId}/assign-delivery`, payload);
  return data.data;
}

export async function createStockReport(payload: CreateStockReportPayload): Promise<StockReport> {
  const { data } = await api.post('/stock/reports', payload);
  return data.data;
}

export async function getBoardStockReports(): Promise<StockBoardReportsResponse> {
  const { data } = await api.get('/stock/board/reports');
  return data.data;
}

export async function downloadStockReportPdf(reportId: string): Promise<Blob> {
  const { data } = await api.get(`/stock/reports/${reportId}/document`, {
    responseType: 'blob',
  });
  return data;
}
