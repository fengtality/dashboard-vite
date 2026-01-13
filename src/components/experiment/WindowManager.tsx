import { Rnd } from 'react-rnd';
import { X, Minus, Maximize2, Copy, RotateCcw, LayoutGrid } from 'lucide-react';
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

// Window content components
import { OrdersWindow } from './windows/OrdersWindow';
import { TradesWindow } from './windows/TradesWindow';
import { PriceChartWindow } from './windows/PriceChartWindow';
import { OrderBookWindow } from './windows/OrderBookWindow';
import { TradeSpotWindow } from './windows/TradeSpotWindow';
import { TradePerpWindow } from './windows/TradePerpWindow';
import { SwapWindow } from './windows/SwapWindow';
import { AddLiquidityWindow } from './windows/AddLiquidityWindow';
import { PortfolioWindow } from './windows/PortfolioWindow';
import { TransactionsWindow } from './windows/TransactionsWindow';
import { KeysWindow } from './windows/KeysWindow';
import { PlaceholderWindow } from './windows/PlaceholderWindow';

function WindowContent({ window }: { window: WindowState }) {
  switch (window.type) {
    case 'price-chart':
      return <PriceChartWindow context={window.context} />;
    case 'order-book':
      return <OrderBookWindow context={window.context} />;
    case 'trade-spot':
      return <TradeSpotWindow context={window.context} />;
    case 'trade-perp':
      return <TradePerpWindow context={window.context} />;
    case 'swap':
      return <SwapWindow context={window.context} />;
    case 'add-liquidity':
      return <AddLiquidityWindow context={window.context} />;
    case 'portfolio':
      return <PortfolioWindow context={window.context} />;
    case 'orders':
      return <OrdersWindow context={window.context} />;
    case 'trades':
      return <TradesWindow context={window.context} />;
    case 'transactions':
      return <TransactionsWindow context={window.context} />;
    case 'keys':
      return <KeysWindow />;
    case 'run-bot':
      return <PlaceholderWindow title="Run Bot" description="Bot deployment interface coming soon" />;
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

  // Skip windows with unknown types (e.g., old windows from localStorage)
  if (!defaults) {
    return null;
  }

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
            <WindowContent
              key={`${window.id}-${window.context?.connector}-${window.context?.pair}`}
              window={window}
            />
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
  const { windows, selectedConnector, selectedPair } = useExperiment();

  // Show empty state when no connector or pair selected
  const showEmptyState = !selectedConnector || !selectedPair;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {showEmptyState && windows.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Market Selected</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {!selectedConnector
              ? 'Select an exchange or network from the toolbar above to get started.'
              : 'Select a trading pair to open windows and start trading.'}
          </p>
        </div>
      )}
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
