import { redirect } from 'next/navigation';

export default function PaymentResultPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    if (typeof value === 'string') {
      params.set(key, value);
    }
  });

  const query = params.toString();
  redirect(query ? `/payment/return?${query}` : '/payment/return');
}
