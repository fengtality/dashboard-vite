import { Rnd } from 'react-rnd';
import { X, Minus, Maximize2, Copy, RotateCcw } from 'lucide-react';
import { useExperiment, getWindowDefaults, type WindowState } from './ExperimentProvider';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Window content components - lazy loaded
import { BalancesWindow } from './windows/BalancesWindow';
import { OrdersWindow } from './windows/OrdersWindow';
import { TradesWindow } from './windows/TradesWindow';
import { PositionsWindow } from './windows/PositionsWindow';
import { PriceChartWindow } from './windows/PriceChartWindow';
import { OrderBookWindow } from './windows/OrderBookWindow';
import { TradeActionWindow } from './windows/TradeActionWindow';
import { KeysWindow } from './windows/KeysWindow';
import { PlaceholderWindow } from './windows/PlaceholderWindow';

function WindowContent({ window }: { window: WindowState }) {
  switch (window.type) {
    case 'balances':
      return <BalancesWindow context={window.context} />;
    case 'orders':
      return <OrdersWindow context={window.context} />;
    case 'trades':
      return <TradesWindow context={window.context} />;
    case 'positions':
      return <PositionsWindow context={window.context} />;
    case 'price-chart':
      return <PriceChartWindow context={window.context} />;
    case 'order-book':
      return <OrderBookWindow context={window.context} />;
    case 'trade-action':
      return <TradeActionWindow context={window.context} />;
    case 'keys':
      return <KeysWindow />;
    case 'order-depth':
      return <PlaceholderWindow title="Order Depth" description="Depth chart visualization coming soon" />;
    case 'run-bot':
      return <PlaceholderWindow title="Run Bot" description="Bot deployment interface coming soon" />;
    case 'lp-positions':
      return <PlaceholderWindow title="LP Positions" description="AMM LP positions coming soon" />;
    default:
      return <PlaceholderWindow title="Unknown" description="Unknown window type" />;
  }
}

interface DraggableWindowProps {
  window: WindowState;
}

function DraggableWindow({ window }: DraggableWindowProps) {
  const { updateWindow, removeWindow, bringToFront, minimizeWindow, addWindow } = useExperiment();
  const defaults = getWindowDefaults(window.type);

  if (window.minimized) {
    return null;
  }

  const handleResetSize = () => {
    updateWindow(window.id, {
      width: defaults.width,
      height: defaults.height,
    });
  };

  const handleDuplicate = () => {
    addWindow(window.type, window.context);
  };

  return (
    <Rnd
      position={{ x: window.x, y: window.y }}
      size={{ width: window.width, height: window.height }}
      minWidth={defaults.minWidth}
      minHeight={defaults.minHeight}
      bounds="parent"
      dragHandleClassName="window-drag-handle"
      onDragStart={() => bringToFront(window.id)}
      onDragStop={(_e, d) => {
        updateWindow(window.id, { x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        updateWindow(window.id, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          x: position.x,
          y: position.y,
        });
      }}
      onMouseDown={() => bringToFront(window.id)}
      style={{ zIndex: window.zIndex }}
      className="absolute"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      resizeHandleStyles={{
        top: { cursor: 'n-resize' },
        right: { cursor: 'e-resize' },
        bottom: { cursor: 's-resize' },
        left: { cursor: 'w-resize' },
        topRight: { cursor: 'ne-resize' },
        bottomRight: { cursor: 'se-resize' },
        bottomLeft: { cursor: 'sw-resize' },
        topLeft: { cursor: 'nw-resize' },
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex flex-col h-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Title Bar */}
          <div className="window-drag-handle flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-move select-none shrink-0">
            <span className="text-sm font-medium truncate">{window.title}</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  minimizeWindow(window.id);
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                title="Minimize"
              >
                <Minus size={12} className="text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeWindow(window.id);
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto p-3">
            <WindowContent window={window} />
          </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Window
          </ContextMenuItem>
          <ContextMenuItem onClick={handleResetSize}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Size
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => minimizeWindow(window.id)}>
            <Minus className="mr-2 h-4 w-4" />
            Minimize
            <ContextMenuShortcut>_</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => bringToFront(window.id)}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Bring to Front
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => removeWindow(window.id)}
            className="text-destructive focus:text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Close
            <ContextMenuShortcut>×</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Rnd>
  );
}

export function WindowManager() {
  const { windows } = useExperiment();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {windows.map(window => (
        <DraggableWindow key={window.id} window={window} />
      ))}
    </div>
  );
}

// Minimized windows bar (taskbar style)
export function MinimizedWindowsBar() {
  const { windows, restoreWindow, removeWindow } = useExperiment();
  const minimizedWindows = windows.filter(w => w.minimized);

  if (minimizedWindows.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1.5 bg-background/95 backdrop-blur border-t border-border">
      {minimizedWindows.map(window => (
        <ContextMenu key={window.id}>
          <ContextMenuTrigger asChild>
            <button
              onClick={() => restoreWindow(window.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded border border-border",
                "bg-card hover:bg-accent transition-colors truncate max-w-[150px]"
              )}
              title={window.title}
            >
              {window.title}
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem onClick={() => restoreWindow(window.id)}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Restore
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => removeWindow(window.id)}
              className="text-destructive focus:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}
