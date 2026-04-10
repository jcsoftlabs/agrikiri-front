export type SupportedCountryCode = 'HT' | 'US';

export interface AddressFormValue {
  label: string;
  countryCode: SupportedCountryCode;
  fullName: string;
  phoneCountryCode: '+509' | '+1';
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  deliveryInstructions: string;
  isDefault: boolean;
}

export const COUNTRY_OPTIONS = [
  { value: 'HT', label: 'Haïti', phoneCountryCode: '+509' as const, stateLabel: 'Département', postalCodeLabel: 'Code postal', postalCodeRequired: false },
  { value: 'US', label: 'États-Unis', phoneCountryCode: '+1' as const, stateLabel: 'État', postalCodeLabel: 'ZIP Code', postalCodeRequired: true },
] as const;

export const HAITI_DEPARTMENTS = [
  'Artibonite',
  'Centre',
  'Grand’Anse',
  'Nippes',
  'Nord',
  'Nord-Est',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Est',
];

export const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts',
  'Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

export function getRegionOptions(countryCode: SupportedCountryCode) {
  return countryCode === 'US' ? US_STATES : HAITI_DEPARTMENTS;
}

export function getCountryMeta(countryCode: SupportedCountryCode) {
  return COUNTRY_OPTIONS.find((country) => country.value === countryCode) || COUNTRY_OPTIONS[0];
}

export function createEmptyAddressForm(defaults?: Partial<AddressFormValue>): AddressFormValue {
  const countryCode = defaults?.countryCode || 'HT';
  const meta = getCountryMeta(countryCode);

  return {
    label: defaults?.label || '',
    countryCode,
    fullName: defaults?.fullName || '',
    phoneCountryCode: defaults?.phoneCountryCode || meta.phoneCountryCode,
    phoneNumber: defaults?.phoneNumber || '',
    addressLine1: defaults?.addressLine1 || '',
    addressLine2: defaults?.addressLine2 || '',
    city: defaults?.city || '',
    stateRegion: defaults?.stateRegion || '',
    postalCode: defaults?.postalCode || '',
    deliveryInstructions: defaults?.deliveryInstructions || '',
    isDefault: defaults?.isDefault || false,
  };
}

export function formatPhoneForDisplay(phoneCountryCode?: string | null, phoneNumber?: string | null) {
  if (!phoneCountryCode && !phoneNumber) return '';
  return `${phoneCountryCode || ''} ${phoneNumber || ''}`.trim();
}
