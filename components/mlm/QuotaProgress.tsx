'use client';

interface QuotaProgressProps {
  currentVP: number;
  targetVP?: number;
  showLabel?: boolean;
}

export default function QuotaProgress({
  currentVP,
  targetVP = 546,
  showLabel = true,
}: QuotaProgressProps) {
  const percentage = Math.min((currentVP / targetVP) * 100, 100);
  const reached = percentage >= 100;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Quota mensuel
          </span>
          <span className={`text-sm font-bold ${reached ? 'text-agri-green-600' : 'text-gray-700'}`}>
            {currentVP.toLocaleString()} / {targetVP.toLocaleString()} VP
            {reached ? ' ✓' : ''}
          </span>
        </div>
      )}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            reached
              ? 'bg-gradient-to-r from-agri-green-500 to-agri-green-400'
              : 'bg-gradient-to-r from-agri-green-600 to-agri-gold-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">0 VP</span>
        <span className={`text-xs font-semibold ${reached ? 'text-agri-green-600' : 'text-gray-500'}`}>
          {reached ? '✅ Quota atteint !' : `${(targetVP - currentVP).toLocaleString()} VP restants`}
        </span>
      </div>
    </div>
  );
}
