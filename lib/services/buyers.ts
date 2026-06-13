import api from '../api';
import type { AccountingChannel } from '../accounting-channels';

export interface BuyerPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BuyerExpenseLine {
  id: string;
  sortOrder: number;
  description: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  lineAmount: number;
}

export interface BuyerExpenseReport {
  id: string;
  summary?: string | null;
  totalSpent: number;
  totalFees: number;
  totalReported: number;
  remainingAmount: number;
  accountingValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: BuyerExpenseLine[];
}

export interface BuyerApprovedBudget {
  id: string;
  title: string;
  status: string;
  disbursementMethod: AccountingChannel;
  accountingExecutedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAmount: number;
  allocatedAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  linkedAllocationsCount: number;
}

export interface BuyerAllocation {
  id: string;
  title: string;
  description?: string | null;
  amountAllocated: number;
  disbursementMethod: AccountingChannel;
  status: 'PENDING_CONFIRMATION' | 'ACTIVE' | 'PARTIALLY_REPORTED' | 'REPORTED';
  statusLabel: string;
  hasPendingAccountingValidation: boolean;
  receivedConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: BuyerPerson;
  allocatedBy: BuyerPerson;
  sourceDossier?: BuyerApprovedBudget | null;
  totalSpent: number;
  totalFees: number;
  totalReported: number;
  remainingAmount: number;
  reports: BuyerExpenseReport[];
}

export interface BuyerOverview {
  totalAllocated: number;
  totalSpent: number;
  totalFees: number;
  totalReported: number;
  totalRemaining: number;
  linkedAllocated?: number;
  linkedReported?: number;
  linkedRemaining?: number;
  unlinkedAllocated?: number;
  unlinkedReported?: number;
  unlinkedRemaining?: number;
  unlinkedAllocationsCount?: number;
  pendingConfirmations: number;
  activeAllocations: number;
  reportedAllocations: number;
  totalBuyers?: number;
  pendingRequests?: number;
  approvedBudgetTotal?: number;
  approvedBudgetAllocated?: number;
  approvedBudgetRemaining?: number;
}

export interface BuyerFundRequest {
  id: string;
  title: string;
  justification: string;
  amountRequested: number;
  status: 'PENDING' | 'ALLOCATED' | 'FULFILLED' | 'DECLINED';
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: BuyerPerson;
  reviewedBy?: BuyerPerson | null;
}

export interface BuyerBoardOverview {
  buyers: BuyerPerson[];
  overview: BuyerOverview;
  allocations: BuyerAllocation[];
  fundRequests: BuyerFundRequest[];
  approvedBudgets: BuyerApprovedBudget[];
}

export interface BuyerDashboardResponse {
  buyer: BuyerPerson;
  overview: BuyerOverview;
  allocations: BuyerAllocation[];
  fundRequests: BuyerFundRequest[];
}

export interface BuyerAllocationPayload {
  buyerId: string;
  sourceDossierId?: string;
  title: string;
  description?: string;
  fundRequestId?: string;
  amountAllocated: number;
  disbursementMethod: AccountingChannel;
}

export interface BuyerExpenseReportPayload {
  summary?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    fees?: number;
  }>;
}

export interface BuyerFundRequestPayload {
  title: string;
  justification: string;
  amountRequested: number;
}

export async function getBuyerBoardOverview(): Promise<BuyerBoardOverview> {
  const { data } = await api.get('/buyers/board/overview');
  return data.data;
}

export async function createBuyerAllocation(payload: BuyerAllocationPayload): Promise<BuyerAllocation> {
  const { data } = await api.post('/buyers/allocations', payload);
  return data.data;
}

export async function getBuyerDashboard(): Promise<BuyerDashboardResponse> {
  const { data } = await api.get('/buyers/my/dashboard');
  return data.data;
}

export async function confirmBuyerAllocation(allocationId: string): Promise<BuyerAllocation> {
  const { data } = await api.post(`/buyers/allocations/${allocationId}/confirm`);
  return data.data;
}

export async function submitBuyerExpenseReport(
  allocationId: string,
  payload: BuyerExpenseReportPayload
): Promise<BuyerExpenseReport> {
  const { data } = await api.post(`/buyers/allocations/${allocationId}/reports`, payload);
  return data.data;
}

export async function createBuyerFundRequest(payload: BuyerFundRequestPayload): Promise<BuyerFundRequest> {
  const { data } = await api.post('/buyers/my/fund-requests', payload);
  return data.data;
}

export async function declineBuyerFundRequest(requestId: string, reviewNote?: string): Promise<BuyerFundRequest> {
  const { data } = await api.post(`/buyers/fund-requests/${requestId}/decline`, reviewNote ? { reviewNote } : {});
  return data.data;
}
