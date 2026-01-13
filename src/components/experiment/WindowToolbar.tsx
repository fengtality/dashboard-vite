import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';
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
  LayoutGrid,
  Trash2,
  AreaChart,
} from 'lucide-react';

interface WindowOption {
  type: WindowType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const marketDataWindows: WindowOption[] = [
  { type: 'price-chart', label: 'Price Chart', icon: BarChart3, shortcut: '⌘1' },
  { type: 'order-book', label: 'Order Book', icon: BookOpen, shortcut: '⌘2' },
  { type: 'order-depth', label: 'Order Depth', icon: AreaChart, shortcut: '⌘3' },
];

const tradingWindows: WindowOption[] = [
  { type: 'trade-action', label: 'Trade', icon: ArrowRightLeft, shortcut: '⌘T' },
  { type: 'run-bot', label: 'Run Bot', icon: Bot, shortcut: '⌘B' },
];

const portfolioWindows: WindowOption[] = [
  { type: 'balances', label: 'Balances', icon: Wallet, shortcut: '⌘4' },
  { type: 'orders', label: 'Orders', icon: ClipboardList, shortcut: '⌘5' },
  { type: 'trades', label: 'Trade History', icon: History, shortcut: '⌘6' },
  { type: 'positions', label: 'Positions', icon: TrendingUp, shortcut: '⌘7' },
  { type: 'lp-positions', label: 'LP Positions', icon: Layers, shortcut: '⌘8' },
];

const settingsWindows: WindowOption[] = [
  { type: 'keys', label: 'API Keys', icon: Key, shortcut: '⌘K' },
];

export function WindowToolbar() {
  const { addWindow, clearAllWindows, windows } = useExperiment();

  const renderWindowItem = (option: WindowOption) => (
    <MenubarItem key={option.type} onClick={() => addWindow(option.type)}>
      <option.icon className="mr-2 h-4 w-4" />
      {option.label}
      {option.shortcut && <MenubarShortcut>{option.shortcut}</MenubarShortcut>}
    </MenubarItem>
  );

  return (
    <Menubar className="rounded-none border-x-0 border-t-0 px-2">
      <MenubarMenu>
        <MenubarTrigger className="font-medium">Windows</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>
              <BarChart3 className="mr-2 h-4 w-4" />
              Market Data
            </MenubarSubTrigger>
            <MenubarSubContent>
              {marketDataWindows.map(renderWindowItem)}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Trading
            </MenubarSubTrigger>
            <MenubarSubContent>
              {tradingWindows.map(renderWindowItem)}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>
              <Wallet className="mr-2 h-4 w-4" />
              Portfolio
            </MenubarSubTrigger>
            <MenubarSubContent>
              {portfolioWindows.map(renderWindowItem)}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          {settingsWindows.map(renderWindowItem)}
          <MenubarSeparator />
          <MenubarItem
            onClick={clearAllWindows}
            disabled={windows.length === 0}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Close All Windows
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="font-medium">Layout</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => {
            // Add default trading layout
            addWindow('price-chart');
            addWindow('order-book');
            addWindow('trade-action');
            addWindow('balances');
          }}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Trading Layout
            <MenubarShortcut>⌘L</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => {
            // Add monitoring layout
            addWindow('orders');
            addWindow('trades');
            addWindow('positions');
            addWindow('balances');
          }}>
            <Layers className="mr-2 h-4 w-4" />
            Monitoring Layout
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem
            onClick={clearAllWindows}
            disabled={windows.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Layout
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
