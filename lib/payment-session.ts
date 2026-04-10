export interface PendingPaymentSession {
  orderId: string;
  orderNumber?: string;
  paymentMethod: 'PLOPPLOP' | 'MONCASH' | 'NATCASH' | 'KASHPAW';
  referenceId: string;
  createdAt: string;
}

const PENDING_PAYMENT_SESSION_KEY = 'agrikiri_pending_payment_session';

export function savePendingPaymentSession(session: PendingPaymentSession): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(PENDING_PAYMENT_SESSION_KEY, JSON.stringify(session));
}

export function getPendingPaymentSession(): PendingPaymentSession | null {
  if (typeof window === 'undefined') return null;

  const rawValue = localStorage.getItem(PENDING_PAYMENT_SESSION_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as PendingPaymentSession;
  } catch {
    localStorage.removeItem(PENDING_PAYMENT_SESSION_KEY);
    return null;
  }
}

export function clearPendingPaymentSession(orderId?: string): void {
  if (typeof window === 'undefined') return;

  if (!orderId) {
    localStorage.removeItem(PENDING_PAYMENT_SESSION_KEY);
    return;
  }

  const currentSession = getPendingPaymentSession();
  if (!currentSession || currentSession.orderId === orderId) {
    localStorage.removeItem(PENDING_PAYMENT_SESSION_KEY);
  }
}
