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
  AreaChart,
} from 'lucide-react';

interface DesktopIconDef {
  type: WindowType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const defaultIcons: DesktopIconDef[] = [
  { type: 'price-chart', label: 'Price Chart', icon: BarChart3 },
  { type: 'order-book', label: 'Order Book', icon: BookOpen },
  { type: 'order-depth', label: 'Order Depth', icon: AreaChart },
  { type: 'trade-action', label: 'Trade', icon: ArrowRightLeft },
  { type: 'run-bot', label: 'Run Bot', icon: Bot },
  { type: 'balances', label: 'Balances', icon: Wallet },
  { type: 'orders', label: 'Orders', icon: ClipboardList },
  { type: 'trades', label: 'Trades', icon: History },
  { type: 'positions', label: 'Positions', icon: TrendingUp },
  { type: 'keys', label: 'API Keys', icon: Key },
];

// Icon dimensions
const ICON_WIDTH = 80;
const ICON_HEIGHT = 90;
const START_RIGHT = 16;
const START_Y = 16;

export function DesktopIcons() {
  const { addWindow, windows, bringToFront, selectedConnectorType } = useExperiment();
  const [selectedIcon, setSelectedIcon] = useState<WindowType | null>(null);

  // Check if a window of this type is open
  const isWindowOpen = useCallback((type: WindowType) => {
    // For positions, check both positions and lp-positions
    if (type === 'positions') {
      return windows.some(w => w.type === 'positions' || w.type === 'lp-positions');
    }
    return windows.some(w => w.type === type);
  }, [windows]);

  // Handle single click - select icon or focus window if open
  const handleClick = useCallback((type: WindowType, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIcon(type);

    // If window is open, bring it to front
    const openWindow = windows.find(w => w.type === type);
    if (openWindow) {
      bringToFront(openWindow.id);
    }
  }, [windows, bringToFront]);

  // Handle double click - open window
  const handleDoubleClick = useCallback((type: WindowType) => {
    // For positions, open the appropriate window type based on connector
    if (type === 'positions' && selectedConnectorType === 'gateway') {
      addWindow('lp-positions');
    } else {
      addWindow(type);
    }
    setSelectedIcon(null);
  }, [addWindow, selectedConnectorType]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {defaultIcons.map((icon, index) => {
        const isSelected = selectedIcon === icon.type;
        const isOpen = isWindowOpen(icon.type);
        const top = START_Y + index * ICON_HEIGHT;

        return (
          <div
            key={icon.type}
            className="absolute pointer-events-auto cursor-default select-none"
            style={{
              right: START_RIGHT,
              top,
              width: ICON_WIDTH,
            }}
            onClick={(e) => handleClick(icon.type, e)}
            onDoubleClick={() => handleDoubleClick(icon.type)}
          >
            <div className={cn(
              'flex flex-col items-center gap-1 p-2 rounded transition-colors',
              'hover:bg-accent/30',
              isSelected && 'bg-accent/50'
            )}>
              <div className={cn(
                'w-12 h-12 rounded-lg border shadow-sm flex items-center justify-center transition-all',
                isOpen ? 'bg-primary/20 border-primary' : 'bg-background/80',
                isSelected && 'ring-2 ring-primary'
              )}>
                <icon.icon className={cn(
                  'h-6 w-6',
                  isOpen ? 'text-primary' : 'text-foreground'
                )} />
              </div>
              <span className={cn(
                'text-xs text-center leading-tight px-1 rounded',
                isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground/90'
              )}>
                {icon.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
