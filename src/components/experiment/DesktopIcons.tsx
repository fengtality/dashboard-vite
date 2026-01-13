import { useState, useCallback } from 'react';
import { useExperiment, type WindowType } from './ExperimentProvider';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  BookOpen,
  Wallet,
  ClipboardList,
  History,
  TrendingUp,
  ArrowRightLeft,
  Bot,
  Key,
  Layers,
  AreaChart,
} from 'lucide-react';

interface DesktopIcon {
  type: WindowType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const desktopIcons: DesktopIcon[] = [
  { type: 'price-chart', label: 'Price Chart', icon: BarChart3 },
  { type: 'order-book', label: 'Order Book', icon: BookOpen },
  { type: 'order-depth', label: 'Order Depth', icon: AreaChart },
  { type: 'trade-action', label: 'Trade', icon: ArrowRightLeft },
  { type: 'run-bot', label: 'Run Bot', icon: Bot },
  { type: 'balances', label: 'Balances', icon: Wallet },
  { type: 'orders', label: 'Orders', icon: ClipboardList },
  { type: 'trades', label: 'Trades', icon: History },
  { type: 'positions', label: 'Positions', icon: TrendingUp },
  { type: 'lp-positions', label: 'LP Positions', icon: Layers },
  { type: 'keys', label: 'API Keys', icon: Key },
];

export function DesktopIcons() {
  const { addWindow } = useExperiment();
  const [selectedIcon, setSelectedIcon] = useState<WindowType | null>(null);

  // Handle single click - select icon
  const handleClick = useCallback((type: WindowType, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIcon(type);
  }, []);

  // Handle double click - open window
  const handleDoubleClick = useCallback((type: WindowType) => {
    addWindow(type);
    setSelectedIcon(null);
  }, [addWindow]);

  // Handle click on desktop background - deselect
  const handleDesktopClick = useCallback(() => {
    setSelectedIcon(null);
  }, []);

  return (
    <div
      className="absolute inset-0 z-0"
      onClick={handleDesktopClick}
    >
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        {desktopIcons.map((icon) => {
          const isSelected = selectedIcon === icon.type;
          return (
            <button
              key={icon.type}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded w-20 transition-colors',
                'hover:bg-accent/30',
                isSelected && 'bg-accent/50'
              )}
              onClick={(e) => handleClick(icon.type, e)}
              onDoubleClick={() => handleDoubleClick(icon.type)}
            >
              <div className={cn(
                'w-12 h-12 rounded-lg bg-background/80 border shadow-sm flex items-center justify-center transition-all',
                isSelected && 'ring-2 ring-primary'
              )}>
                <icon.icon className="h-6 w-6 text-foreground" />
              </div>
              <span className={cn(
                'text-xs text-center leading-tight px-1 rounded',
                isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground/90'
              )}>
                {icon.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
