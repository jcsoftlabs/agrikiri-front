import api from '../api';
import type { AccountingChannel } from '../accounting-channels';

export type DeliveryReportWeightUnit = 'LBS' | 'KG';

export interface DeliveryReportItem {
  deliveryNoteItemId: string;
  description: string;
  orderedQuantity: number;
  assignedQuantity: number;
  alreadyReportedQuantity: number;
  deliveredThisReport: number;
  remainingAfterReport: number;
  unitWeightLbs: number;
  unitWeightKg: number;
  lineWeightLbs: number;
  lineWeightKg: number;
}

export interface DeliveryAgentReport {
  id: string;
  title: string;
  shiftDate: string;
  summary: string;
  totalAssigned: number;
  deliveredCount: number;
  failedCount: number;
  remainingAssigned: number;
  totalDeliveredWeightLbs: number;
  totalDeliveredWeightKg: number;
  weightUnit: DeliveryReportWeightUnit;
  reportItems: DeliveryReportItem[];
  cashCollected: number;
  cashCollectionMethod: AccountingChannel;
  fieldExpenses: number;
  fieldExpensesMethod: AccountingChannel;
  incidents?: string | null;
  nextActions?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryNote?: {
    id: string;
    noteNumber: string;
    status: string;
    customerName: string;
    totalQuantity: number;
    totalWeightLbs: number;
  } | null;
  deliveryAgent: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email: string;
  };
}

export interface DeliveryReportsBoardResponse {
  overview: {
    totalReports: number;
    totalAssigned: number;
    totalDelivered: number;
    totalFailed: number;
    totalCashCollected: number;
    totalFieldExpenses: number;
    totalDeliveredWeightLbs: number;
  };
  reports: DeliveryAgentReport[];
}

export interface CreateDeliveryReportPayload {
  title: string;
  shiftDate: string;
  summary: string;
  deliveryNoteId?: string;
  weightUnit: DeliveryReportWeightUnit;
  reportItems: Array<{
    deliveryNoteItemId: string;
    quantity: number;
  }>;
  totalAssigned: number;
  deliveredCount: number;
  failedCount: number;
  cashCollected: number;
  cashCollectionMethod: AccountingChannel;
  fieldExpenses: number;
  fieldExpensesMethod: AccountingChannel;
  incidents?: string;
  nextActions?: string;
}

export async function getMyDeliveryReports(): Promise<DeliveryAgentReport[]> {
  const { data } = await api.get('/delivery-reports/my');
  return data.data;
}

export async function createMyDeliveryReport(payload: CreateDeliveryReportPayload): Promise<DeliveryAgentReport> {
  const { data } = await api.post('/delivery-reports/my', payload);
  return data.data;
}

export async function getBoardDeliveryReports(): Promise<DeliveryReportsBoardResponse> {
  const { data } = await api.get('/delivery-reports/board');
  return data.data;
}

export async function downloadDeliveryReportPdf(reportId: string): Promise<Blob> {
  const { data } = await api.get(`/delivery-reports/${reportId}/document`, {
    responseType: 'blob',
  });
  return data;
}
