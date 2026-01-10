import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatting';

export interface MetricCardProps {
  label: string;
  value: number | string | unknown;
  format?: 'currency' | 'percent' | 'number';
  decimals?: number;
  showTrend?: boolean;
  className?: string;
}

/**
 * Reusable metric card component for displaying KPIs
 * Supports currency, percentage, and number formatting with optional trend indicators
 */
export function MetricCard({
  label,
  value,
  format,
  decimals = 2,
  showTrend = true,
  className = '',
}: MetricCardProps) {
  const numValue = typeof value === 'number' ? value : 0;
  const isPositive = numValue >= 0;

  let displayValue: string;
  if (format === 'currency') {
    displayValue = formatCurrency(numValue, decimals);
  } else if (format === 'percent') {
    displayValue = formatPercent(numValue, decimals);
  } else if (format === 'number') {
    displayValue = formatNumber(numValue, decimals, decimals);
  } else {
    displayValue = typeof value === 'number' ? value.toLocaleString() : String(value);
  }

  const showTrendIcon = format === 'currency' && showTrend;

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {showTrendIcon && (
          <>
            {isPositive ? (
              <TrendingUp className="text-green-500" size={16} />
            ) : (
              <TrendingDown className="text-red-500" size={16} />
            )}
          </>
        )}
        <span
          className={`text-lg font-semibold ${
            showTrendIcon
              ? isPositive
                ? 'text-green-500'
                : 'text-red-500'
              : 'text-foreground'
          }`}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
