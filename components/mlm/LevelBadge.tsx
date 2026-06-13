'use client';

const MLM_LEVEL_CONFIG: Record<string, {
  name: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  description: string;
}> = {
  CUSTOMER: {
    name: 'Client',
    color: '#6b7280',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: '🛒',
    description: 'Acheteur',
  },
  BUYER: {
    name: 'Acheteur',
    color: '#8B5E34',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: '🧾',
    description: 'Achats terrain',
  },
  STOCK_MANAGER: {
    name: 'Stock',
    color: '#3f7d20',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    text: 'text-lime-700',
    icon: '🏬',
    description: 'Gestionnaire de stock',
  },
  DELIVERY_AGENT: {
    name: 'Livreur',
    color: '#2563eb',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    icon: '🚚',
    description: 'Livraisons terrain',
  },
  ACCOUNTANT: {
    name: 'Compta',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    icon: '📘',
    description: 'Suivi comptable',
  },
  CASHIER: {
    name: 'Caissier',
    color: '#be123c',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: '🧾',
    description: 'Point de vente',
  },
  ASSOCIATE: {
    name: 'Associé',
    color: '#0f766e',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    icon: '🗳️',
    description: 'Gouvernance',
  },
  ADMIN: {
    name: 'Admin',
    color: '#1f2937',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    icon: '🛠️',
    description: 'Administration',
  },
  AYIZAN: {
    name: 'Ayizan',
    color: '#4A90D9',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: '🌱',
    description: 'Vendeur Indépendant',
  },
  GUACANAGARIC: {
    name: 'Guacanagaric',
    color: '#F5A623',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: '⭐',
    description: 'Leader Émergent',
  },
  MACKANDAL: {
    name: 'Mackandal',
    color: '#7ED321',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: '🔥',
    description: 'Directeur Régional',
  },
  BOUKMAN: {
    name: 'Boukman',
    color: '#D0021B',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: '👑',
    description: 'Directeur National',
  },
  SANITE_BELAIRE: {
    name: 'Sanite Bèlè',
    color: '#9B59B6',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: '💎',
    description: 'Diamant',
  },
  TOUSSAINT_LOUVERTURE: {
    name: 'Toussaint Louverture',
    color: '#E67E22',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: '🏆',
    description: 'Double Diamant',
  },
  CATHERINE_FLON: {
    name: 'Catherine Flon',
    color: '#1ABC9C',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    icon: '🌟',
    description: 'Triple Diamant',
  },
  JEAN_JACQUES_DESSALINES: {
    name: 'Jean Jacques Dessalines',
    color: '#D4AF37',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: '👑',
    description: 'Couronne Présidentielle',
  },
};

interface LevelBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  showIcon?: boolean;
}

export default function LevelBadge({
  level,
  size = 'md',
  showDescription = false,
  showIcon = true,
}: LevelBadgeProps) {
  const config = MLM_LEVEL_CONFIG[level] || MLM_LEVEL_CONFIG.CUSTOMER;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]}`}
      >
        {showIcon && <span>{config.icon}</span>}
        {config.name}
      </span>
      {showDescription && (
        <span className="text-xs text-gray-500 pl-1">{config.description}</span>
      )}
    </div>
  );
}

export { MLM_LEVEL_CONFIG };
