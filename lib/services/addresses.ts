import api from '../api';

export interface CustomerAddress {
  id: string;
  label: string;
  countryCode: 'HT' | 'US';
  fullName: string;
  phoneCountryCode: '+509' | '+1';
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateRegion: string;
  postalCode?: string | null;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCustomerAddressPayload {
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
  isDefault?: boolean;
}

export async function getMyAddresses(): Promise<CustomerAddress[]> {
  const { data } = await api.get('/auth/addresses');
  return data.data || [];
}

export async function createAddress(payload: UpsertCustomerAddressPayload): Promise<CustomerAddress> {
  const { data } = await api.post('/auth/addresses', payload);
  return data.data;
}

export async function updateAddress(addressId: string, payload: UpsertCustomerAddressPayload): Promise<CustomerAddress> {
  const { data } = await api.patch(`/auth/addresses/${addressId}`, payload);
  return data.data;
}

export async function setDefaultAddress(addressId: string): Promise<CustomerAddress> {
  const { data } = await api.patch(`/auth/addresses/${addressId}/default`);
  return data.data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/auth/addresses/${addressId}`);
}
