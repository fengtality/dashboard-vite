import { useState, useMemo } from 'react';
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
  ArrowDownUp,
  Bot,
  Key,
  LayoutGrid,
  Trash2,
  AreaChart,
  Save,
  Menu,
  RotateCcw,
  Check,
  Droplets,
  Receipt,
} from 'lucide-react';
import { isPerpetualConnector } from '@/lib/connectors';

interface WindowOption {
  type: WindowType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  // Which connector types this window is available for
  connectorTypes: ('spot' | 'perp' | 'gateway' | 'all')[];
}

// All windows with their availability by connector type
const ALL_WINDOWS: WindowOption[] = [
  // Settings - always available
  { type: 'keys', label: 'API Keys', description: 'Manage exchange credentials', icon: Key, connectorTypes: ['all'] },

  // Market Data - available for CEX connectors
  { type: 'price-chart', label: 'Price Chart', description: 'View candlestick charts and price history', icon: BarChart3, connectorTypes: ['spot', 'perp'] },
  { type: 'order-book', label: 'Order Book', description: 'Real-time bid/ask order book', icon: BookOpen, connectorTypes: ['spot', 'perp'] },
  { type: 'order-depth', label: 'Order Depth', description: 'Visualize market depth', icon: AreaChart, connectorTypes: ['spot', 'perp'] },

  // Trading - Spot CEX
  { type: 'trade-spot', label: 'Trade Spot', description: 'Place spot buy and sell orders', icon: ArrowRightLeft, connectorTypes: ['spot'] },

  // Trading - Perp CEX
  { type: 'trade-perp', label: 'Trade Perp', description: 'Trade perpetuals with leverage', icon: ArrowRightLeft, connectorTypes: ['perp'] },

  // Trading - Gateway/DEX
  { type: 'swap', label: 'Swap', description: 'Swap tokens on DEX', icon: ArrowDownUp, connectorTypes: ['gateway'] },
  { type: 'add-liquidity', label: 'Add Liquidity', description: 'Provide liquidity to pools', icon: Droplets, connectorTypes: ['gateway'] },

  // Bot
  { type: 'run-bot', label: 'Run Bot', description: 'Deploy and manage trading bots', icon: Bot, connectorTypes: ['spot', 'perp'] },

  // Portfolio - CEX
  { type: 'balances', label: 'Balances', description: 'View account token balances', icon: Wallet, connectorTypes: ['all'] },
  { type: 'orders', label: 'Orders', description: 'Active and historical orders', icon: ClipboardList, connectorTypes: ['spot', 'perp'] },
  { type: 'trades', label: 'Trade History', description: 'View past trade executions', icon: History, connectorTypes: ['spot', 'perp'] },
  { type: 'positions', label: 'Positions', description: 'Perpetual positions', icon: TrendingUp, connectorTypes: ['perp'] },

  // Portfolio - Gateway
  { type: 'lp-positions', label: 'LP Positions', description: 'AMM liquidity positions', icon: TrendingUp, connectorTypes: ['gateway'] },
  { type: 'transactions', label: 'Transactions', description: 'DEX swap history', icon: Receipt, connectorTypes: ['gateway'] },
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
    selectedConnector,
    selectedConnectorType,
  } = useExperiment();

  const [startOpen, setStartOpen] = useState(false);

  // Determine the effective connector category
  const connectorCategory = useMemo((): 'spot' | 'perp' | 'gateway' | null => {
    if (!selectedConnector) return null;
    if (selectedConnectorType === 'gateway') return 'gateway';
    // Check if it's a perpetual connector
    if (isPerpetualConnector(selectedConnector)) return 'perp';
    return 'spot';
  }, [selectedConnector, selectedConnectorType]);

  // Check if a window type is available for current connector
  const isWindowAvailable = (opt: WindowOption): boolean => {
    if (opt.connectorTypes.includes('all')) return true;
    if (!connectorCategory) return false;
    return opt.connectorTypes.includes(connectorCategory);
  };

  const handleOpenWindow = (type: WindowType) => {
    addWindow(type);
    setStartOpen(false);
  };

  // Check if a window of this type is open
  const isWindowOpen = (type: WindowType) => {
    return windows.some(w => w.type === type);
  };

  // Find icon for a window type (for taskbar buttons)
  const getWindowIcon = (type: WindowType) => {
    const opt = ALL_WINDOWS.find(w => w.type === type);
    return opt?.icon || LayoutGrid;
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
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
              {ALL_WINDOWS.map((opt) => {
                const available = isWindowAvailable(opt);
                return (
                  <button
                    key={opt.type}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                      available
                        ? 'hover:bg-accent cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                    onClick={() => available && handleOpenWindow(opt.type)}
                    disabled={!available}
                  >
                    {/* Check indicator - shows when window is open */}
                    <div className="w-4 flex items-center justify-center shrink-0">
                      {isWindowOpen(opt.type) && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <opt.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{opt.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{opt.description}</div>
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
          const Icon = getWindowIcon(win.type);
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
