import api from '../api';

export type AccountingRange = '7d' | '30d' | '90d' | 'custom';

export interface AccountingDashboard {
  range: AccountingRange;
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  overview: {
    totalInflows: number;
    totalOutflows: number;
    netTreasury: number;
    totalOnlinePaid: number;
    totalPosSales: number;
    deliveryCashCollected: number;
    buyerAllocated: number;
    approvedBudgetTotal: number;
    approvedBudgetAllocated: number;
    approvedBudgetRemaining: number;
    buyerSpent: number;
    buyerFees: number;
    buyerReported: number;
    deliveryFieldExpenses: number;
    pendingFundRequestsAmount: number;
    pendingFundRequestsCount: number;
    pendingCodAmount: number;
    pendingBuyerBalance: number;
    pendingAllocationConfirmations: number;
    inTransitDeliveryNotes: number;
  };
  comparison: {
    inflows: ComparisonMetric;
    outflows: ComparisonMetric;
    netTreasury: ComparisonMetric;
    buyerAllocated: ComparisonMetric;
  };
  cashflow: Array<{
    key: string;
    label: string;
    inflows: number;
    outflows: number;
    net: number;
  }>;
  collections: {
    online: number;
    pos: number;
    manual: number;
    deliveryCashCollected: number;
    paidOrdersCount: number;
    completedPosSalesCount: number;
    byMethod: Array<{
      method: string;
      label: string;
      amount: number;
    }>;
  };
  disbursements: {
    buyerAllocated: number;
    buyerSpent: number;
    buyerFees: number;
    buyerReported: number;
    deliveryFieldExpenses: number;
    pendingFundRequestsAmount: number;
    pendingFundRequestsCount: number;
    byMethod: Array<{
      method: string;
      label: string;
      amount: number;
    }>;
  };
  budgetEnvelopes: {
    totalApproved: number;
    totalAllocated: number;
    totalRemaining: number;
    totalPending: number;
    pendingExecutionCount: number;
    items: Array<{
      id: string;
      title: string;
      method: string;
      approvedAmount: number;
      allocatedAmount: number;
      pendingAmount: number;
      remainingAmount: number;
      createdAt: string;
      accountingExecutedAt: string | null;
      linkedAllocationsCount: number;
    }>;
  };
  reconciliation: {
    pendingCodCount: number;
    pendingCodAmount: number;
    inTransitDeliveryNotes: number;
    pendingAllocationConfirmations: number;
    openAllocationCount: number;
    openAllocationBalance: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'success';
    title: string;
    message: string;
  }>;
  recentOperations: Array<{
    id: string;
    type: string;
    label: string;
    counterparty: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
  pendingCashOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    amount: number;
    deliveredAt: string | null;
  }>;
  pendingFundRequests: Array<{
    id: string;
    title: string;
    buyer: string;
    amountRequested: number;
    createdAt: string;
  }>;
  pendingBuyerAllocations: Array<{
    id: string;
    title: string;
    buyer: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
  pendingBuyerReports: Array<{
    id: string;
    title: string;
    buyer: string;
    amount: number;
    createdAt: string;
  }>;
  pendingDeliveryExpenses: Array<{
    id: string;
    title: string;
    deliveryAgent: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
  pendingDossierExecutions: Array<{
    id: string;
    title: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
  recentClosures: Array<{
    id: string;
    rangeLabel: string;
    startDate: string;
    endDate: string;
    totalInflows: number;
    totalOutflows: number;
    netTreasury: number;
    note?: string | null;
    closedById: string;
    createdAt: string;
  }>;
}

interface ComparisonMetric {
  current: number;
  previous: number;
  diff: number;
  percent: number;
  direction: 'up' | 'down' | 'flat';
}

export const getAccountingDashboard = async (
  range: AccountingRange = '30d',
  startDate?: string,
  endDate?: string
): Promise<AccountingDashboard> => {
  const params = new URLSearchParams();
  params.set('range', range);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const { data } = await api.get(`/accounting/dashboard?${params.toString()}`);
  return data.data;
};

export async function reconcileAccountingCashOrder(orderId: string) {
  const { data } = await api.post(`/accounting/orders/${orderId}/reconcile-cash`);
  return data.data;
}

export async function createManualAccountingInflow(payload: {
  title: string;
  amount: number;
  channel: 'CASH' | 'MONCASH' | 'NATCASH' | 'PLOPPLOP' | 'CHEQUE' | 'VIREMENT_BANCAIRE' | 'KASHPAW' | 'AUTRE';
  occurredAt: string;
  category?: string;
  counterparty?: string;
  reference?: string;
  note?: string;
}) {
  const { data } = await api.post('/accounting/inflows/manual', payload);
  return data.data;
}

export async function validateAccountingOutflow(payload: { type: 'BUYER_ALLOCATION' | 'BUYER_REPORT' | 'DELIVERY_REPORT'; id: string }) {
  const { data } = await api.post('/accounting/outflows/validate', payload);
  return data.data;
}

export async function markAccountingDossierExecuted(dossierId: string) {
  const { data } = await api.post(`/accounting/dossiers/${dossierId}/execute`);
  return data.data;
}

export async function closeAccountingPeriod(payload: {
  range: AccountingRange;
  startDate?: string;
  endDate?: string;
  note?: string;
}) {
  const { data } = await api.post('/accounting/periods/close', payload);
  return data.data;
}

export async function downloadAccountingJournal(range: AccountingRange, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  params.set('range', range);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const response = await api.get(`/accounting/journal/export?${params.toString()}`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `journal-comptable-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
