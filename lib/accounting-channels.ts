export type AccountingChannel =
  | 'CASH'
  | 'MONCASH'
  | 'NATCASH'
  | 'PLOPPLOP'
  | 'CHEQUE'
  | 'VIREMENT_BANCAIRE'
  | 'KASHPAW'
  | 'AUTRE';

export const ACCOUNTING_CHANNEL_OPTIONS: Array<{ value: AccountingChannel; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MONCASH', label: 'MonCash' },
  { value: 'NATCASH', label: 'NatCash' },
  { value: 'PLOPPLOP', label: 'PLOP PLOP' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { value: 'KASHPAW', label: 'Kashpaw' },
  { value: 'AUTRE', label: 'Autre' },
];

const LABELS = Object.fromEntries(ACCOUNTING_CHANNEL_OPTIONS.map((option) => [option.value, option.label])) as Record<
  AccountingChannel,
  string
>;

export function getAccountingChannelLabel(channel?: string | null) {
  if (!channel) return 'Autre';
  return LABELS[channel as AccountingChannel] || channel;
}
