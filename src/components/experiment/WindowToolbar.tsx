import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useExperiment, type WindowType } from './ExperimentProvider';
import { MarketSelector } from './MarketSelector';
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
  Save,
  Pencil,
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

// Default layout IDs that cannot be modified
const DEFAULT_LAYOUT_IDS = ['trading', 'monitoring', 'chart-focus'];

export function WindowToolbar() {
  const {
    addWindow,
    clearAllWindows,
    windows,
    layouts,
    applyLayout,
    saveCurrentLayout,
    deleteLayout,
    renameLayout,
  } = useExperiment();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');

  const handleSaveLayout = () => {
    if (newLayoutName.trim()) {
      saveCurrentLayout(newLayoutName.trim());
      setNewLayoutName('');
      setSaveDialogOpen(false);
    }
  };

  const handleRenameLayout = (layoutId: string) => {
    if (editingLayoutName.trim()) {
      renameLayout(layoutId, editingLayoutName.trim());
      setEditingLayoutId(null);
      setEditingLayoutName('');
    }
  };

  const renderWindowItem = (option: WindowOption) => (
    <MenubarItem key={option.type} onClick={() => addWindow(option.type)}>
      <option.icon className="mr-2 h-4 w-4" />
      {option.label}
      {option.shortcut && <MenubarShortcut>{option.shortcut}</MenubarShortcut>}
    </MenubarItem>
  );

  return (
    <>
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
            <MenubarSub>
              <MenubarSubTrigger>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Apply Layout
              </MenubarSubTrigger>
              <MenubarSubContent>
                {layouts.map((layout) => (
                  <MenubarItem
                    key={layout.id}
                    onClick={() => applyLayout(layout.id)}
                  >
                    {layout.name}
                    {!DEFAULT_LAYOUT_IDS.includes(layout.id) && (
                      <span className="ml-2 text-xs text-muted-foreground">(custom)</span>
                    )}
                  </MenubarItem>
                ))}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem
              onClick={() => setSaveDialogOpen(true)}
              disabled={windows.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Current Layout...
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>
                <Pencil className="mr-2 h-4 w-4" />
                Manage Layouts
              </MenubarSubTrigger>
              <MenubarSubContent>
                {layouts.filter(l => !DEFAULT_LAYOUT_IDS.includes(l.id)).length === 0 ? (
                  <MenubarItem disabled>
                    No custom layouts
                  </MenubarItem>
                ) : (
                  layouts
                    .filter(l => !DEFAULT_LAYOUT_IDS.includes(l.id))
                    .map((layout) => (
                      <MenubarSub key={layout.id}>
                        <MenubarSubTrigger>{layout.name}</MenubarSubTrigger>
                        <MenubarSubContent>
                          <MenubarItem
                            onClick={() => {
                              setEditingLayoutId(layout.id);
                              setEditingLayoutName(layout.name);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </MenubarItem>
                          <MenubarItem
                            onClick={() => deleteLayout(layout.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </MenubarItem>
                        </MenubarSubContent>
                      </MenubarSub>
                    ))
                )}
              </MenubarSubContent>
            </MenubarSub>
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

        {/* Market Selector */}
        <div className="flex-1" />
        <MarketSelector />
      </Menubar>

      {/* Save Layout Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Layout</DialogTitle>
            <DialogDescription>
              Save the current window arrangement as a custom layout.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Layout name"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLayout} disabled={!newLayoutName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Layout Dialog */}
      <Dialog open={!!editingLayoutId} onOpenChange={(open) => !open && setEditingLayoutId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Layout</DialogTitle>
            <DialogDescription>
              Enter a new name for this layout.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Layout name"
              value={editingLayoutName}
              onChange={(e) => setEditingLayoutName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && editingLayoutId && handleRenameLayout(editingLayoutId)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLayoutId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingLayoutId && handleRenameLayout(editingLayoutId)}
              disabled={!editingLayoutName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
