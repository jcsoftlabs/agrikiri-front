import api from '../api';
import { IS_MOCK, MOCK_DELIVERIES } from '@/lib/mockData';

export interface OrderItem {
  id: string;
  productId: string;
  productVariantId?: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: {
      url: string;
      isPrimary?: boolean;
    }[];
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
  status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'DELIVERY_FAILED' | 'CANCELLED' | null;
  isCustomerVisible: boolean;
  createdAt: string;
}

export interface DeliveryProofLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
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
  subtotalAmount?: number;
  deliveryFee?: number;
  totalAmount: number;
  amountCollected?: number;
  amountRemaining?: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'DELIVERY_FAILED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'FAILED';
  paymentMethod?: 'PLOPPLOP' | 'MONCASH' | 'CASH' | 'NATCASH' | 'KASHPAW';
  deliveryAddress?: DeliveryAddress;
  deliveryMode?: 'INTERNAL' | 'EXTERNAL';
  deliveryAgentId?: string | null;
  carrierName?: string | null;
  deliveryAgentName?: string | null;
  deliveryAgentPhone?: string | null;
  deliveryZone?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  deliveryRecipientName?: string | null;
  deliveryProofNote?: string | null;
  deliveryProofPhotoUrl?: string | null;
  deliveryProofPhotoPublicId?: string | null;
  deliverySignatureUrl?: string | null;
  deliverySignaturePublicId?: string | null;
  deliveredLatitude?: number | null;
  deliveredLongitude?: number | null;
  deliveredLocationAccuracy?: number | null;
  deliveryProofCapturedAt?: string | null;
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
  deliveryAgent?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface UpdateOrderTrackingPayload {
  deliveryMode?: 'INTERNAL' | 'EXTERNAL';
  deliveryAgentId?: string | null;
  carrierName?: string;
  deliveryAgentName?: string;
  deliveryAgentPhone?: string;
  deliveryZone?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  eventTitle?: string;
  eventDescription?: string;
  eventStatus?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'DELIVERY_FAILED' | 'CANCELLED';
  isCustomerVisible?: boolean;
}

export interface DeliveryAssignment extends Order {}

export const getMyDeliveryAssignments = async (): Promise<DeliveryAssignment[]> => {
  if (IS_MOCK) return MOCK_DELIVERIES as unknown as DeliveryAssignment[];
  const { data } = await api.get('/orders/delivery/my-assignments');
  return (data.data || []).map(normalizeOrder);
};

export const updateMyDeliveryStatus = async (
  orderId: string,
  payload: {
    status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'DELIVERY_FAILED';
    note?: string;
    recipientName?: string;
    proofPhotoUrl?: string;
    proofPhotoPublicId?: string;
    signatureUrl?: string;
    signaturePublicId?: string;
    latitude?: number;
    longitude?: number;
    locationAccuracy?: number;
  }
): Promise<Order> => {
  if (IS_MOCK) {
    // En mode mock : retourne la commande avec le statut mis à jour
    const found = MOCK_DELIVERIES.find((o) => o.id === orderId);
    return { ...(found || {}), ...payload } as unknown as Order;
  }
  const { data } = await api.patch(`/orders/${orderId}/delivery-status`, payload);
  return normalizeOrder(data.data);
};

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
    subtotalAmount: order?.subtotalAmount != null ? Number(order.subtotalAmount) : undefined,
    deliveryFee: order?.deliveryFee != null ? Number(order.deliveryFee) : undefined,
    amountCollected: order?.amountCollected != null ? Number(order.amountCollected) : 0,
    amountRemaining:
      order?.totalAmount != null
        ? Math.max(0, Number(order.totalAmount) - Number(order?.amountCollected ?? 0))
        : undefined,
    orderItems: normalizedItems,
    items: normalizedItems,
    trackingEvents: order?.trackingEvents ?? [],
    deliveredLatitude:
      order?.deliveredLatitude != null ? Number(order.deliveredLatitude) : null,
    deliveredLongitude:
      order?.deliveredLongitude != null ? Number(order.deliveredLongitude) : null,
    deliveredLocationAccuracy:
      order?.deliveredLocationAccuracy != null ? Number(order.deliveredLocationAccuracy) : null,
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

export const markOrderPaymentFailed = async (
  orderId: string,
  reason: 'cancelled' | 'failed' = 'failed'
): Promise<Order> => {
  const { data } = await api.post(`/orders/${orderId}/mark-payment-failed`, { reason });
  return normalizeOrder(data.data);
};

export const cancelMyOrder = async (orderId: string): Promise<Order> => {
  const { data } = await api.post(`/orders/${orderId}/cancel`);
  return normalizeOrder(data.data);
};

// Get all orders for admin
export const getAllOrders = async (
  page = 1,
  limit = 20,
  status?: string,
  paymentStatus?: string,
  deliveryAgentId?: string
): Promise<OrdersListResponse> => {
  const { data } = await api.get('/orders/all', { params: { page, limit, status, paymentStatus, deliveryAgentId } });
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

export const downloadOrderInvoice = async (orderId: string): Promise<Blob> => {
  const { data } = await api.get(`/orders/${orderId}/invoice`, {
    responseType: 'blob',
  });

  return data;
};
