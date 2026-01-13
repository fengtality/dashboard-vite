import { useState, useCallback, useRef } from 'react';
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
  { type: 'lp-positions', label: 'LP Positions', icon: Layers },
  { type: 'keys', label: 'API Keys', icon: Key },
];

// Initial positions for icons in a grid
const ICON_WIDTH = 80;
const ICON_HEIGHT = 90;
const GRID_COLS = 1;
const START_X = 16;
const START_Y = 16;

function getInitialPositions(): Record<WindowType, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  defaultIcons.forEach((icon, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    positions[icon.type] = {
      x: START_X + col * ICON_WIDTH,
      y: START_Y + row * ICON_HEIGHT,
    };
  });
  return positions as Record<WindowType, { x: number; y: number }>;
}

export function DesktopIcons() {
  const { addWindow, windows, bringToFront } = useExperiment();
  const [selectedIcon, setSelectedIcon] = useState<WindowType | null>(null);
  const [positions, setPositions] = useState(getInitialPositions);
  const [dragging, setDragging] = useState<WindowType | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Check if a window of this type is open
  const isWindowOpen = useCallback((type: WindowType) => {
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
    addWindow(type);
    setSelectedIcon(null);
  }, [addWindow]);

  // Drag handlers
  const handleMouseDown = useCallback((type: WindowType, e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
    setSelectedIcon(type);
    const pos = positions[type];
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPositions(prev => ({
        ...prev,
        [type]: {
          x: moveEvent.clientX - dragOffset.current.x,
          y: moveEvent.clientY - dragOffset.current.y,
        },
      }));
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [positions]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {defaultIcons.map((icon) => {
        const isSelected = selectedIcon === icon.type;
        const isOpen = isWindowOpen(icon.type);
        const isDragging = dragging === icon.type;
        const pos = positions[icon.type];

        return (
          <div
            key={icon.type}
            className={cn(
              'absolute pointer-events-auto cursor-default select-none',
              isDragging && 'cursor-grabbing opacity-80'
            )}
            style={{
              left: pos.x,
              top: pos.y,
              width: ICON_WIDTH,
            }}
            onMouseDown={(e) => handleMouseDown(icon.type, e)}
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
