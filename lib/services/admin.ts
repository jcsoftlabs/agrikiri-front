import api from '../api';

export interface AdminStats {
  stats: {
    totalUsers: number;
    totalAyizan: number;
    totalOrders: number;
    totalSales: number;
    newUsersMonth: number;
  };
  recentOrders: {
    number: string;
    customer: string;
    amount: string;
    status: string;
    date: string;
  }[];
  topProducts: {
    name: string;
    ventes: number;
  }[];
  salesHistory: {
    week: string;
    ventes: number;
  }[];
}

export interface AdminReports {
  range: '7d' | '30d' | '90d' | 'custom';
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filters: {
    categoryId?: string;
    productId?: string;
    orderStatus?: string;
    paymentStatus?: string;
  };
  overview: {
    totalSales: number;
    totalOrders: number;
    averageBasket: number;
    totalItemsSold: number;
    deliveredOrders: number;
    pendingOrders: number;
    newUsers: number;
    newAyizan: number;
    conversionRate: number;
  };
  comparison: {
    totalSales: {
      current: number;
      previous: number;
      diff: number;
      percent: number;
      direction: 'up' | 'down' | 'flat';
    };
    totalOrders: {
      current: number;
      previous: number;
      diff: number;
      percent: number;
      direction: 'up' | 'down' | 'flat';
    };
    averageBasket: {
      current: number;
      previous: number;
      diff: number;
      percent: number;
      direction: 'up' | 'down' | 'flat';
    };
    totalCommissions: {
      current: number;
      previous: number;
      diff: number;
      percent: number;
      direction: 'up' | 'down' | 'flat';
    };
    newAyizan: {
      current: number;
      previous: number;
      diff: number;
      percent: number;
      direction: 'up' | 'down' | 'flat';
    };
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'success';
    title: string;
    message: string;
  }>;
  salesHistory: Array<{
    key: string;
    label: string;
    ventes: number;
    commandes: number;
  }>;
  comparisonHistory: Array<{
    label: string;
    currentSales: number;
    previousSales: number;
    currentOrders: number;
    previousOrders: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  paymentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    amount: number;
  }>;
  topCategories: Array<{
    categoryId: string;
    name: string;
    quantity: number;
    amount: number;
  }>;
  commissions: {
    total: number;
    paid: number;
    pending: number;
    byType: Array<{
      type: string;
      amount: number;
    }>;
  };
  details: {
    orders: Array<{
      id: string;
      orderNumber: string;
      customer: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      itemCount: number;
      createdAt: string;
    }>;
    products: Array<{
      productId: string;
      name: string;
      quantity: number;
      amount: number;
      averagePrice: number;
    }>;
    commissions: Array<{
      id: string;
      createdAt: string;
      ayizanName: string;
      sourceName: string;
      type: string;
      status: string;
      amount: number;
    }>;
  };
}

export type AdminReportsRange = '7d' | '30d' | '90d' | 'custom';

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  mlmLevel: string;
  personalVolume: number;
  isActive: boolean;
  referralCode: string;
  createdAt: string;
}

export interface UsersListResponse {
  users: UserListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'AYIZAN' | 'ADMIN';
  isActive?: boolean;
  password?: string;
}

export type CreateAdminUserPayload = AdminUserPayload & { password: string };
export type UpdateAdminUserPayload = Partial<AdminUserPayload>;

// Get global stats for admin dashboard
export const getAdminStats = async (): Promise<AdminStats> => {
  const { data } = await api.get('/admin/dashboard-stats');
  return data.data;
};

export const getAdminReports = async (
  range: AdminReportsRange = '30d',
  startDate?: string,
  endDate?: string,
  filters?: {
    categoryId?: string;
    productId?: string;
    orderStatus?: string;
    paymentStatus?: string;
  }
): Promise<AdminReports> => {
  const { data } = await api.get('/admin/reports', { params: { range, startDate, endDate, ...filters } });
  return data.data;
};

export const exportAdminReports = async (
  type: 'sales' | 'commissions',
  range: AdminReportsRange = '30d',
  startDate?: string,
  endDate?: string,
  filters?: {
    categoryId?: string;
    productId?: string;
    orderStatus?: string;
    paymentStatus?: string;
  }
): Promise<Blob> => {
  const response = await api.get('/admin/reports/export', {
    params: { type, range, startDate, endDate, ...filters },
    responseType: 'blob',
  });

  return response.data;
};

// Get list of all users for admin
export const getUsersList = async (page = 1, limit = 20, search = ''): Promise<UsersListResponse> => {
  const { data } = await api.get('/admin/users', { params: { page, limit, search } });
  return data.data;
};

export const createAdminUser = async (payload: CreateAdminUserPayload): Promise<UserListItem> => {
  const { data } = await api.post('/admin/users', payload);
  return data.data;
};

export const updateAdminUser = async (id: string, payload: UpdateAdminUserPayload): Promise<UserListItem> => {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data.data;
};

export const deleteAdminUser = async (id: string): Promise<UserListItem> => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data.data;
};
