import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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
  LayoutGrid,
  Trash2,
  AreaChart,
  Save,
  Menu,
  RotateCcw,
  Check,
} from 'lucide-react';

interface WindowOption {
  type: WindowType;
  label: string;
  description: string;
  gatewayLabel?: string;
  gatewayDescription?: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Windows in same order as desktop icons
const allWindows: WindowOption[] = [
  { type: 'price-chart', label: 'Price Chart', description: 'View candlestick charts and price history', icon: BarChart3 },
  { type: 'order-book', label: 'Order Book', description: 'Real-time bid/ask order book', icon: BookOpen },
  { type: 'order-depth', label: 'Order Depth', description: 'Visualize market depth', icon: AreaChart },
  { type: 'trade-action', label: 'Trade', description: 'Place buy and sell orders', icon: ArrowRightLeft },
  { type: 'run-bot', label: 'Run Bot', description: 'Deploy and manage trading bots', icon: Bot },
  { type: 'balances', label: 'Balances', description: 'View account token balances', icon: Wallet },
  { type: 'orders', label: 'Orders', description: 'Active and historical orders', icon: ClipboardList },
  { type: 'trades', label: 'Trade History', description: 'View past trade executions', icon: History },
  { type: 'positions', label: 'Positions', description: 'Perpetual positions', gatewayLabel: 'LP Positions', gatewayDescription: 'AMM liquidity positions', icon: TrendingUp },
  { type: 'keys', label: 'API Keys', description: 'Manage exchange credentials', icon: Key },
];

export function Taskbar() {
  const {
    addWindow,
    clearAllWindows,
    windows,
    saveLayout,
    resetLayout,
    bringToFront,
    restoreWindow,
    selectedConnectorType,
  } = useExperiment();

  const [startOpen, setStartOpen] = useState(false);

  const handleOpenWindow = (type: WindowType) => {
    // For positions, open the appropriate window type based on connector
    if (type === 'positions' && selectedConnectorType === 'gateway') {
      addWindow('lp-positions');
    } else {
      addWindow(type);
    }
    setStartOpen(false);
  };

  const isGateway = selectedConnectorType === 'gateway';

  // Check if a window of this type is open
  const isWindowOpen = (type: WindowType) => {
    // For positions, check both positions and lp-positions
    if (type === 'positions') {
      return windows.some(w => w.type === 'positions' || w.type === 'lp-positions');
    }
    return windows.some(w => w.type === type);
  };

  return (
    <div className="flex items-center h-10 border-t bg-background px-2 gap-2">
      {/* Start Button */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-3">
            <Menu className="h-4 w-4 mr-2" />
            Start
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="top">
          <div className="p-1">
            {/* Windows as vertical list */}
            <div className="space-y-0.5">
              {allWindows.map((opt) => {
                const label = isGateway && opt.gatewayLabel ? opt.gatewayLabel : opt.label;
                const description = isGateway && opt.gatewayDescription ? opt.gatewayDescription : opt.description;
                return (
                  <button
                    key={opt.type}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left transition-colors"
                    onClick={() => handleOpenWindow(opt.type)}
                  >
                    {/* Check indicator - shows when window is open */}
                    <div className="w-4 flex items-center justify-center shrink-0">
                      {isWindowOpen(opt.type) && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <opt.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{label}</div>
                      <div className="text-xs text-muted-foreground truncate">{description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t my-1" />

            {/* Layout Actions */}
            <div className="flex items-center gap-1 px-1 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs flex-1"
                onClick={() => {
                  saveLayout();
                  setStartOpen(false);
                }}
                disabled={windows.length === 0}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs flex-1"
                onClick={() => {
                  resetLayout();
                  setStartOpen(false);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs flex-1 text-destructive hover:text-destructive"
                onClick={() => {
                  clearAllWindows();
                  setStartOpen(false);
                }}
                disabled={windows.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Open Windows (taskbar buttons) */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.map((win) => {
          const opt = allWindows.find(w => w.type === win.type);
          const Icon = opt?.icon || LayoutGrid;
          return (
            <Button
              key={win.id}
              variant={win.minimized ? 'outline' : 'secondary'}
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={() => {
                if (win.minimized) {
                  restoreWindow(win.id);
                } else {
                  bringToFront(win.id);
                }
              }}
            >
              <Icon className="h-3 w-3 mr-1" />
              {win.title}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
