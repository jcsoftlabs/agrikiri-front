import api from '../api';

export interface MLMStats {
  monthlyCommissions: number;
  monthlyDirectCommissions: number;
  monthlyNetworkCommissions: number;
  monthlyBonus: number;
  personalVP: number;
  networkVP: number;
  newRecruits: number;
  quotaReached: boolean;
  quotaVP: number;
  quotaProgress: number;
  downlineCount: number;
  currentLevel?: {
    name: string;
    monthlyCommission?: number | null;
    requiredDownline?: number;
    description?: string;
  };
  nextLevel?: {
    key: string;
    name: string;
    monthlyCommission?: number | null;
    requiredDownline?: number;
    description?: string;
  } | null;
}

export interface Commission {
  id: string;
  sourceUserId: string;
  sourceEmail?: string | null;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  orderNumber?: string | null;
  orderTotal?: number | null;
  orderVP?: number | null;
  orderPaymentStatus?: string | null;
}

export interface CommissionHistoryPoint {
  month: number;
  year: number;
  label: string;
  total: number;
  pending: number;
  validated: number;
  paid: number;
  personalVP: number;
  networkVP: number;
  quotaReached: boolean;
}

export interface MlmActivity {
  recentRecruits: Array<{
    id: string;
    name: string;
    role: string;
    mlmLevel: string;
    personalVolume: number;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    totalVP: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  recentCommissions: Commission[];
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  withdrawal?: {
    id: string;
    status: string;
    method: string;
    recipientPhone: string;
    externalReference?: string | null;
  } | null;
}

export interface WalletWithdrawal {
  id: string;
  amount: number;
  method: string;
  recipientName: string;
  recipientPhone: string;
  status: string;
  externalReference?: string | null;
  userNote?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface MlmWallet {
  wallet: {
    id: string;
    balance: number;
    pendingWithdrawalAmount: number;
    totalEarned: number;
    totalWithdrawn: number;
    availableBalance: number;
    updatedAt: string;
  };
  transactions: WalletTransaction[];
  withdrawals: WalletWithdrawal[];
  minimumWithdrawalAmount: number;
}

export interface WithdrawalInput {
  amount: number;
  method?: 'MONCASH' | 'NATCASH' | 'VIREMENT_BANCAIRE' | 'CASH';
  recipientName?: string;
  recipientPhone: string;
  userNote?: string;
}

export interface NetworkMember {
  id: string;
  firstName: string;
  lastName: string;
  mlmLevel: string;
  personalVolume: number;
  lastActive: string;
  avatarUrl?: string;
}

export interface NetworkTree {
  id: string;
  name: string;
  level: string;
  vp: number;
  attributes: Record<string, any>;
  children: NetworkTree[];
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLastActive(value?: string) {
  if (!value) return 'Récent';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Récent';

  return date.toLocaleDateString('fr-HT', {
    day: 'numeric',
    month: 'short',
  });
}

// Stats for dashboard
export const getMyMLMStats = async (): Promise<MLMStats> => {
  const { data } = await api.get('/mlm/my-stats');
  const payload = data.data;
  const monthlyPerformance = payload?.monthlyPerformance;

  return {
    monthlyCommissions: toNumber(monthlyPerformance?.totalCommissions),
    monthlyDirectCommissions: toNumber(monthlyPerformance?.directCommissions),
    monthlyNetworkCommissions: toNumber(monthlyPerformance?.networkCommissions),
    monthlyBonus: toNumber(monthlyPerformance?.bonus),
    personalVP: toNumber(payload?.personalVP),
    networkVP: toNumber(monthlyPerformance?.networkVP),
    newRecruits: toNumber(monthlyPerformance?.downlineCount ?? payload?.downlineCount),
    quotaReached: Boolean(monthlyPerformance?.quotaReached),
    quotaVP: toNumber(payload?.quotaVP) || 546,
    quotaProgress: toNumber(payload?.quotaProgress),
    downlineCount: toNumber(payload?.downlineCount),
    currentLevel: payload?.currentLevel,
    nextLevel: payload?.nextLevel || null,
  };
};

// Commissions list
export const getMyCommissions = async (): Promise<Commission[]> => {
  const { data } = await api.get('/commissions');
  const commissions = data.data?.commissions || [];

  return commissions.map((commission: any) => ({
    id: commission.id,
    sourceUserId: commission.sourceUser
      ? `${commission.sourceUser.firstName} ${commission.sourceUser.lastName}`
      : commission.sourceUserId || 'Système',
    sourceEmail: commission.sourceUser?.email || null,
    type: commission.type,
    amount: toNumber(commission.amount),
    status: commission.status,
    createdAt: commission.createdAt,
    orderNumber: commission.order?.orderNumber || null,
    orderTotal: commission.order ? toNumber(commission.order.totalAmount) : null,
    orderVP: commission.order ? toNumber(commission.order.totalVP) : null,
    orderPaymentStatus: commission.order?.paymentStatus || null,
  }));
};

export const getMyCommissionHistory = async (): Promise<CommissionHistoryPoint[]> => {
  const { data } = await api.get('/commissions/history', { params: { months: 12 } });
  const history = data.data || [];

  return history.map((item: any) => ({
    month: Number(item.month),
    year: Number(item.year),
    label: item.label,
    total: toNumber(item.total),
    pending: toNumber(item.pending),
    validated: toNumber(item.validated),
    paid: toNumber(item.paid),
    personalVP: toNumber(item.personalVP),
    networkVP: toNumber(item.networkVP),
    quotaReached: Boolean(item.quotaReached),
  }));
};

export const getMyMlmActivity = async (): Promise<MlmActivity> => {
  const { data } = await api.get('/commissions/activity');
  const payload = data.data || {};

  return {
    recentRecruits: (payload.recentRecruits || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      mlmLevel: item.mlmLevel,
      personalVolume: toNumber(item.personalVolume),
      createdAt: item.createdAt,
    })),
    recentOrders: (payload.recentOrders || []).map((item: any) => ({
      id: item.id,
      orderNumber: item.orderNumber,
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      totalAmount: toNumber(item.totalAmount),
      totalVP: toNumber(item.totalVP),
      status: item.status,
      paymentStatus: item.paymentStatus,
      createdAt: item.createdAt,
    })),
    recentCommissions: (payload.recentCommissions || []).map((commission: any) => ({
      id: commission.id,
      sourceUserId: commission.sourceName || 'Système',
      sourceEmail: commission.sourceEmail || null,
      type: commission.type,
      amount: toNumber(commission.amount),
      status: commission.status,
      createdAt: commission.createdAt,
      orderNumber: commission.orderNumber || null,
      orderTotal: commission.orderTotal === null ? null : toNumber(commission.orderTotal),
      orderVP: commission.orderVP === null ? null : toNumber(commission.orderVP),
      orderPaymentStatus: commission.orderPaymentStatus || null,
    })),
  };
};

export const getMyWallet = async (): Promise<MlmWallet> => {
  const { data } = await api.get('/commissions/wallet');
  const payload = data.data;

  return {
    wallet: {
      id: payload.wallet.id,
      balance: toNumber(payload.wallet.balance),
      pendingWithdrawalAmount: toNumber(payload.wallet.pendingWithdrawalAmount),
      totalEarned: toNumber(payload.wallet.totalEarned),
      totalWithdrawn: toNumber(payload.wallet.totalWithdrawn),
      availableBalance: toNumber(payload.wallet.availableBalance),
      updatedAt: payload.wallet.updatedAt,
    },
    transactions: (payload.transactions || []).map((item: any) => ({
      ...item,
      amount: toNumber(item.amount),
      balanceAfter: toNumber(item.balanceAfter),
    })),
    withdrawals: (payload.withdrawals || []).map((item: any) => ({
      ...item,
      amount: toNumber(item.amount),
    })),
    minimumWithdrawalAmount: toNumber(payload.minimumWithdrawalAmount),
  };
};

export const requestWalletWithdrawal = async (input: WithdrawalInput): Promise<WalletWithdrawal> => {
  const { data } = await api.post('/commissions/wallet/withdrawals', input);
  return {
    ...data.data,
    amount: toNumber(data.data.amount),
  };
};

export const downloadMyCommissionsCsv = async (): Promise<Blob> => {
  const response = await api.get('/commissions/export/my', { responseType: 'blob' });
  return response.data;
};

// Network list
export const getMyNetworkList = async (): Promise<NetworkMember[]> => {
  const { data } = await api.get('/mlm/my-network');
  const members = data.data?.directDownline || [];

  return members.map((member: any) => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    mlmLevel: member.mlmLevel,
    personalVolume: toNumber(member.personalVolume),
    lastActive: formatLastActive(member.createdAt),
    avatarUrl: member.avatarUrl || undefined,
  }));
};

// Network Tree for D3
export const getMyNetworkTree = async (): Promise<NetworkTree> => {
  const { data } = await api.get('/mlm/my-network');
  const tree = data.data?.tree;
  const stats = data.data?.stats || {};

  if (!tree) {
    throw new Error('Arbre réseau introuvable.');
  }

  const normalizeTree = (node: any): NetworkTree => ({
    id: node.id,
    name: node.name || `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Membre',
    level: node.level || node.mlmLevel || 'CUSTOMER',
    vp: toNumber(node.vp ?? node.personalVolume),
    attributes: {
      isActive: Boolean(node.isActive),
    },
    children: (node.children || []).map(normalizeTree),
  });

  return {
    ...normalizeTree(tree),
    attributes: {
      totalMembers: toNumber(stats.totalMembers),
      directMembers: toNumber(stats.directMembers),
      activeMembers: toNumber(stats.activeThisMonth),
    },
  };
};

// Leaderboard
export const getLeaderboard = async (): Promise<any[]> => {
  const { data } = await api.get('/mlm/leaderboard');
  return data.data || [];
};

// --- ADMIN SERVICES ---

export interface MLMGlobalStats {
  levelDistribution: {
    level: string;
    count: number;
    levelInfo: any;
  }[];
  activeThisMonth: number;
  totalAyizan: number;
  totalCustomers: number;
  totalCommissionsThisMonth: number;
}

export interface AdminWalletWithdrawal extends WalletWithdrawal {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mlmLevel: string;
  };
  reviewedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// Get global MLM stats for admin
export const getAdminMlmStats = async (): Promise<MLMGlobalStats> => {
  const { data } = await api.get('/mlm/stats');
  return data.data;
};

// Validate monthly quota and process commissions
export const validateMonthlyQuota = async (month?: number, year?: number) => {
  const { data } = await api.post('/mlm/validate-quota', { month, year });
  return data.data;
};

export const getAdminWalletWithdrawals = async (): Promise<AdminWalletWithdrawal[]> => {
  const { data } = await api.get('/commissions/withdrawals', { params: { limit: 20 } });
  return (data.data?.withdrawals || []).map((item: any) => ({
    ...item,
    amount: toNumber(item.amount),
  }));
};

export const updateAdminWalletWithdrawal = async (
  id: string,
  input: { status: 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED'; externalReference?: string; adminNote?: string }
): Promise<AdminWalletWithdrawal> => {
  const { data } = await api.patch(`/commissions/withdrawals/${id}`, input);
  return {
    ...data.data,
    amount: toNumber(data.data.amount),
  };
};
