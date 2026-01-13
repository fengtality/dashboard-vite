import { useExperiment, type WindowType } from './ExperimentProvider';
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

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-0">
      {desktopIcons.map((icon) => (
        <button
          key={icon.type}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent/50 transition-colors w-20 group"
          onDoubleClick={() => addWindow(icon.type)}
          title={`Double-click to open ${icon.label}`}
        >
          <div className="w-12 h-12 rounded-lg bg-background/80 border shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
            <icon.icon className="h-6 w-6 text-foreground" />
          </div>
          <span className="text-xs text-center text-foreground/90 leading-tight">
            {icon.label}
          </span>
        </button>
      ))}
    </div>
  );
}
