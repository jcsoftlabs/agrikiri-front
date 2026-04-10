import api from '../api';

export interface Commission {
  id: string;
  sourceUserId: string;
  type: 'DIRECT' | 'NETWORK' | 'MONTHLY_BONUS' | 'LEVEL_BONUS';
  amount: number;
  status: 'PENDING' | 'VALIDATED' | 'PAID';
  createdAt: string;
  month: number;
  year: number;
  sourceUser?: {
    firstName: string;
    lastName: string;
  };
}

export interface CommissionsListResponse {
  commissions: Commission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Get all commissions for admin
export const getAllCommissions = async (
  page = 1,
  limit = 20,
  status?: string,
  type?: string
): Promise<CommissionsListResponse> => {
  const { data } = await api.get('/commissions/all', { params: { page, limit, status, type } });
  return data.data;
};

// Validate all commissions for a month (Admin)
export const validateCommissions = async (month: number, year: number) => {
  const { data } = await api.post('/commissions/validate', { month, year });
  return data.data;
};

// Mark commissions as paid (Admin)
export const markCommissionsAsPaid = async (commissionIds: string[]) => {
  const { data } = await api.post('/commissions/pay', { ids: commissionIds });
  return data.data;
};

// My commissions summary (Current user)
export const getMyCommissionsSummary = async () => {
  const { data } = await api.get('/commissions/summary');
  return data.data;
};
