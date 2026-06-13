'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

interface CartQuickDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  productName?: string;
  variantLabel?: string;
  quantity?: number;
}

export default function CartQuickDrawer({
  open,
  onClose,
  title,
  description,
  productName,
  variantLabel,
  quantity,
}: CartQuickDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Fermer le drawer panier"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-600">Panier mis à jour</p>
            <h2 className="font-display text-2xl text-agri-dark mt-1">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-gray-200 text-gray-500 hover:text-agri-dark hover:border-agri-green-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="rounded-2xl border border-agri-green-100 bg-agri-green-50 p-4">
            <p className="font-semibold text-agri-dark">{description}</p>
            {(productName || variantLabel || quantity) && (
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                {productName && <p>Produit : <span className="font-medium text-agri-dark">{productName}</span></p>}
                {variantLabel && <p>Format : <span className="font-medium text-agri-dark">{variantLabel}</span></p>}
                {typeof quantity === 'number' && <p>Quantité : <span className="font-medium text-agri-dark">{quantity}</span></p>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
            <p className="font-semibold text-agri-dark">Que voulez-vous faire ensuite ?</p>
            <p className="text-sm text-gray-500">
              Vous pouvez continuer vos achats, ouvrir votre panier, ou passer directement au checkout guidé.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          <Link href="/cart?checkout=1" onClick={onClose} className="block">
            <Button variant="primary" size="lg" className="w-full">
              Finaliser ma commande
            </Button>
          </Link>
          <Link href="/cart" onClick={onClose} className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Voir le panier
            </Button>
          </Link>
          <Button variant="ghost" size="lg" className="w-full" onClick={onClose}>
            Continuer mes achats
          </Button>
        </div>
      </aside>
    </div>
  );
}
