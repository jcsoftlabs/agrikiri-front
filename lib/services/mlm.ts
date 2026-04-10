import api from '../api';

export interface MLMStats {
  monthlyCommissions: number;
  personalVP: number;
  networkVP: number;
  newRecruits: number;
  quotaReached: boolean;
}

export interface Commission {
  id: string;
  sourceUserId: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
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
    personalVP: toNumber(payload?.personalVP),
    networkVP: toNumber(monthlyPerformance?.networkVP),
    newRecruits: toNumber(monthlyPerformance?.downlineCount ?? payload?.downlineCount),
    quotaReached: Boolean(monthlyPerformance?.quotaReached),
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
    type: commission.type,
    amount: toNumber(commission.amount),
    status: commission.status,
    createdAt: commission.createdAt,
  }));
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

  if (!tree) {
    throw new Error('Arbre réseau introuvable.');
  }

  return tree;
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
