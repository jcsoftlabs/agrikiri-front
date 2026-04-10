'use client';

import { AddressFormValue, getCountryMeta, getRegionOptions } from '@/lib/address-utils';

interface AddressFormProps {
  value: AddressFormValue;
  onChange: (value: AddressFormValue) => void;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  showDefaultToggle?: boolean;
  wrapInForm?: boolean;
  showActions?: boolean;
}

export default function AddressForm({
  value,
  onChange,
  submitLabel,
  loading = false,
  onSubmit,
  onCancel,
  showDefaultToggle = true,
  wrapInForm = true,
  showActions = true,
}: AddressFormProps) {
  const countryMeta = getCountryMeta(value.countryCode);
  const regionOptions = getRegionOptions(value.countryCode);

  const updateField = <K extends keyof AddressFormValue>(field: K, fieldValue: AddressFormValue[K]) => {
    if (field === 'countryCode') {
      const nextMeta = getCountryMeta(fieldValue as AddressFormValue['countryCode']);
      onChange({
        ...value,
        countryCode: fieldValue as AddressFormValue['countryCode'],
        phoneCountryCode: nextMeta.phoneCountryCode,
        stateRegion: '',
        postalCode: '',
      });
      return;
    }

    onChange({ ...value, [field]: fieldValue });
  };

  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Libellé</label>
          <input
            className="input"
            value={value.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Maison, Travail..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
          <select
            className="input"
            value={value.countryCode}
            onChange={(e) => updateField('countryCode', e.target.value as AddressFormValue['countryCode'])}
          >
            <option value="HT">Haïti</option>
            <option value="US">États-Unis</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
          <input
            className="input"
            value={value.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Nom du destinataire"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <input className="input bg-gray-50" value={value.phoneCountryCode} readOnly />
            <input
              className="input"
              value={value.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              placeholder={value.countryCode === 'HT' ? '36123456' : '3055550123'}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
        <input
          className="input"
          value={value.addressLine1}
          onChange={(e) => updateField('addressLine1', e.target.value)}
          placeholder="Rue, numéro, quartier..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Complément d’adresse</label>
        <input
          className="input"
          value={value.addressLine2}
          onChange={(e) => updateField('addressLine2', e.target.value)}
          placeholder="Appartement, étage, point de repère..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
          <input
            className="input"
            value={value.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder={value.countryCode === 'HT' ? 'Port-au-Prince' : 'Miami'}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{countryMeta.stateLabel}</label>
          <select
            className="input"
            value={value.stateRegion}
            onChange={(e) => updateField('stateRegion', e.target.value)}
            required
          >
            <option value="">Sélectionner</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{countryMeta.postalCodeLabel}</label>
          <input
            className="input"
            value={value.postalCode}
            onChange={(e) => updateField('postalCode', e.target.value)}
            placeholder={value.countryCode === 'US' ? '33101' : 'Optionnel'}
            required={countryMeta.postalCodeRequired}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructions de livraison</label>
        <textarea
          className="input min-h-[110px]"
          value={value.deliveryInstructions}
          onChange={(e) => updateField('deliveryInstructions', e.target.value)}
          placeholder="Repère, heure préférable, détails pour la livraison..."
        />
      </div>

      {showDefaultToggle && (
        <label className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={value.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
          />
          <span className="text-sm text-gray-700">Définir comme adresse par défaut</span>
        </label>
      )}

      {showActions && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : submitLabel}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!wrapInForm) {
    return content;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {content}
    </form>
  );
}
