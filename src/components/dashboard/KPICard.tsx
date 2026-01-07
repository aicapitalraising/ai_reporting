import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  clickable?: boolean;
  onClick?: () => void;
  format?: 'currency' | 'percent' | 'number';
}

export function KPICard({
  label,
  value,
  change,
  changeLabel = 'vs prior',
  clickable = false,
  onClick,
  format = 'number',
}: KPICardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-chart-2';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div
      className={cn(
        'border-2 border-border bg-card p-4 transition-all',
        clickable && 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5'
      )}
      onClick={clickable ? onClick : undefined}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
        {clickable && <span className="text-primary ml-1">(click to view)</span>}
      </p>
      <p className="text-2xl font-bold mt-1 font-mono">{formatValue(value)}</p>
      <div className={cn('flex items-center gap-1 mt-2 text-xs', getTrendColor())}>
        {getTrendIcon()}
        <span>{Math.abs(change).toFixed(1)}% {changeLabel}</span>
      </div>
    </div>
  );
}
