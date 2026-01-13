import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Save,
  Menu,
} from 'lucide-react';

interface WindowOption {
  type: WindowType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const allWindows: WindowOption[] = [
  { type: 'price-chart', label: 'Price Chart', icon: BarChart3 },
  { type: 'order-book', label: 'Order Book', icon: BookOpen },
  { type: 'order-depth', label: 'Order Depth', icon: AreaChart },
  { type: 'trade-action', label: 'Trade', icon: ArrowRightLeft },
  { type: 'run-bot', label: 'Run Bot', icon: Bot },
  { type: 'balances', label: 'Balances', icon: Wallet },
  { type: 'orders', label: 'Orders', icon: ClipboardList },
  { type: 'trades', label: 'Trade History', icon: History },
  { type: 'positions', label: 'Positions', icon: TrendingUp },
  { type: 'lp-positions', label: 'LP Positions', icon: Layers },
  { type: 'keys', label: 'API Keys', icon: Key },
];

export function Taskbar() {
  const {
    addWindow,
    clearAllWindows,
    windows,
    layouts,
    applyLayout,
    saveCurrentLayout,
    bringToFront,
    restoreWindow,
  } = useExperiment();

  const [startOpen, setStartOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');

  const handleSaveLayout = () => {
    if (newLayoutName.trim()) {
      saveCurrentLayout(newLayoutName.trim());
      setNewLayoutName('');
      setSaveDialogOpen(false);
    }
  };

  const handleOpenWindow = (type: WindowType) => {
    addWindow(type);
    setStartOpen(false);
  };

  const handleApplyLayout = (layoutId: string) => {
    applyLayout(layoutId);
    setStartOpen(false);
  };

  return (
    <>
      <div className="flex items-center h-10 border-t bg-background px-2 gap-2">
        {/* Start Button */}
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3">
              <Menu className="h-4 w-4 mr-2" />
              Start
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start" side="top">
            <div className="p-2">
              {/* Windows Section */}
              <div className="mb-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  <LayoutGrid className="inline h-3 w-3 mr-1" />
                  Windows
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {allWindows.map((opt) => (
                    <Button
                      key={opt.type}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => handleOpenWindow(opt.type)}
                    >
                      <opt.icon className="h-3 w-3 mr-2" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t my-2" />

              {/* Layouts Section */}
              <div className="mb-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  <Layers className="inline h-3 w-3 mr-1" />
                  Layouts
                </div>
                <div className="space-y-1">
                  {layouts.map((layout) => (
                    <Button
                      key={layout.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => handleApplyLayout(layout.id)}
                    >
                      {layout.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t my-2" />

              {/* Actions */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    setSaveDialogOpen(true);
                    setStartOpen(false);
                  }}
                  disabled={windows.length === 0}
                >
                  <Save className="h-3 w-3 mr-2" />
                  Save Layout...
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    clearAllWindows();
                    setStartOpen(false);
                  }}
                  disabled={windows.length === 0}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Clear All
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
    </>
  );
}
