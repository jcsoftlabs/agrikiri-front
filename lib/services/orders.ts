import api from '../api';

export interface OrderItem {
  id: string;
  productId: string;
  productVariantId?: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
  productVariant?: {
    id: string;
    label: string;
  };
}

export interface CreateOrderPayload {
  items: {
    productId: string;
    productVariantId?: string;
    quantity: number;
  }[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: 'PLOPPLOP' | 'MONCASH' | 'CASH' | 'NATCASH' | 'KASHPAW';
  ayizanId?: string;
}

export interface OrderPaymentSession {
  provider: 'PLOP_PLOP' | null;
  requiresRedirect: boolean;
  paymentUrl: string | null;
  transactionId: string | null;
  referenceId: string;
}

export interface DeliveryAddress {
  label?: string;
  countryCode: 'HT' | 'US';
  fullName: string;
  phoneCountryCode: '+509' | '+1';
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateRegion: string;
  postalCode?: string;
  deliveryInstructions?: string;
}

export interface OrderTrackingEvent {
  id: string;
  title: string;
  description?: string | null;
  status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | null;
  isCustomerVisible: boolean;
  createdAt: string;
}

export interface VerifyOrderPaymentResponse {
  order: Order;
  payment: {
    provider: 'PLOP_PLOP';
    referenceId: string;
    transactionId: string | null;
    transactionStatus: 'PAID' | 'PENDING';
    rawStatus: string | null;
    method: string;
    amount: number;
    verifiedAt: string;
  };
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId: string;
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  paymentMethod?: 'PLOPPLOP' | 'MONCASH' | 'CASH' | 'NATCASH' | 'KASHPAW';
  deliveryAddress?: DeliveryAddress;
  carrierName?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  trackingEvents?: OrderTrackingEvent[];
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  ayizan?: {
    firstName: string;
    lastName: string;
    referralCode?: string | null;
  };
  items?: OrderItem[];
  orderItems?: OrderItem[];
}

export interface UpdateOrderTrackingPayload {
  carrierName?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  eventTitle?: string;
  eventDescription?: string;
  eventStatus?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  isCustomerVisible?: boolean;
}

export interface OrdersListResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function normalizeOrder(order: any): Order {
  const normalizedItems = (order?.orderItems ?? order?.items ?? []).map((item: any) => ({
    ...item,
    price: item?.price ?? item?.unitPrice ?? 0,
  }));

  return {
    ...order,
    orderItems: normalizedItems,
    items: normalizedItems,
    trackingEvents: order?.trackingEvents ?? [],
  };
}

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<{ order: Order; payment: OrderPaymentSession }> => {
  const { data } = await api.post('/orders', payload);
  return {
    order: normalizeOrder(data.data.order),
    payment: data.data.payment,
  };
};

export const verifyOrderPayment = async (orderId: string): Promise<VerifyOrderPaymentResponse> => {
  const { data } = await api.post(`/orders/${orderId}/verify-payment`);
  return {
    order: normalizeOrder(data.data.order),
    payment: data.data.payment,
  };
};

// Get all orders for admin
export const getAllOrders = async (
  page = 1,
  limit = 20,
  status?: string,
  paymentStatus?: string
): Promise<OrdersListResponse> => {
  const { data } = await api.get('/orders/all', { params: { page, limit, status, paymentStatus } });
  return {
    ...data.data,
    orders: (data.data.orders || []).map(normalizeOrder),
  };
};

// Update order status (Admin only)
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentStatus?: string
): Promise<Order> => {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status, paymentStatus });
  return normalizeOrder(data.data);
};

export const updateOrderTracking = async (
  orderId: string,
  payload: UpdateOrderTrackingPayload
): Promise<Order> => {
  const { data } = await api.patch(`/orders/${orderId}/tracking`, payload);
  return normalizeOrder(data.data);
};

// Get user orders (Current user)
export const getMyOrders = async (page = 1, limit = 10): Promise<OrdersListResponse> => {
  const { data } = await api.get('/orders', { params: { page, limit } });
  return {
    ...data.data,
    orders: (data.data.orders || []).map(normalizeOrder),
  };
};

// Get single order detail
export const getOrderDetail = async (orderId: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${orderId}`);
  return normalizeOrder(data.data);
};
