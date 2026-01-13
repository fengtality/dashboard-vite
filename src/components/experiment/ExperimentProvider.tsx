import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type WindowType =
  | 'price-chart'
  | 'order-book'
  | 'order-depth'
  | 'trade-action'
  | 'run-bot'
  | 'balances'
  | 'orders'
  | 'trades'
  | 'positions'
  | 'lp-positions'
  | 'keys';

export interface WindowContext {
  connector?: string;
  pair?: string;
  marketType?: 'spot' | 'perp' | 'amm';
}

export interface WindowState {
  id: string;
  type: WindowType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  context?: WindowContext;
}

interface ExperimentContextType {
  windows: WindowState[];
  addWindow: (type: WindowType, context?: WindowContext) => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  clearAllWindows: () => void;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

const STORAGE_KEY = 'condor-experiment-windows';

// Default sizes and titles for window types
const WINDOW_DEFAULTS: Record<WindowType, { width: number; height: number; title: string; minWidth: number; minHeight: number }> = {
  'price-chart': { width: 600, height: 400, title: 'Price Chart', minWidth: 400, minHeight: 300 },
  'order-book': { width: 320, height: 450, title: 'Order Book', minWidth: 280, minHeight: 300 },
  'order-depth': { width: 500, height: 300, title: 'Order Depth', minWidth: 350, minHeight: 200 },
  'trade-action': { width: 350, height: 400, title: 'Trade', minWidth: 300, minHeight: 350 },
  'run-bot': { width: 400, height: 500, title: 'Run Bot', minWidth: 350, minHeight: 400 },
  'balances': { width: 450, height: 350, title: 'Balances', minWidth: 350, minHeight: 250 },
  'orders': { width: 600, height: 350, title: 'Orders', minWidth: 450, minHeight: 250 },
  'trades': { width: 550, height: 350, title: 'Trades', minWidth: 400, minHeight: 250 },
  'positions': { width: 600, height: 300, title: 'Positions', minWidth: 450, minHeight: 200 },
  'lp-positions': { width: 650, height: 350, title: 'LP Positions', minWidth: 500, minHeight: 250 },
  'keys': { width: 500, height: 400, title: 'API Keys', minWidth: 400, minHeight: 300 },
};

export function getWindowDefaults(type: WindowType) {
  return WINDOW_DEFAULTS[type];
}

let windowCounter = 0;

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          windowCounter = Math.max(0, ...parsed.map((w: WindowState) => parseInt(w.id.split('-')[1] || '0')));
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Persist windows to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  }, [windows]);

  const getMaxZIndex = useCallback(() => {
    return Math.max(0, ...windows.map(w => w.zIndex));
  }, [windows]);

  const addWindow = useCallback((type: WindowType, context?: WindowContext) => {
    const defaults = WINDOW_DEFAULTS[type];
    windowCounter++;

    // Calculate initial position with offset for each new window
    const offset = (windowCounter % 10) * 30;
    const x = 50 + offset;
    const y = 50 + offset;

    const newWindow: WindowState = {
      id: `window-${windowCounter}`,
      type,
      title: defaults.title,
      x,
      y,
      width: defaults.width,
      height: defaults.height,
      zIndex: getMaxZIndex() + 1,
      minimized: false,
      context,
    };

    setWindows(prev => [...prev, newWindow]);
  }, [getMaxZIndex]);

  const removeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateWindow = useCallback((id: string, updates: Partial<WindowState>) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates } : w
    ));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWindows(prev => {
      const maxZ = Math.max(0, ...prev.map(w => w.zIndex));
      return prev.map(w =>
        w.id === id ? { ...w, zIndex: maxZ + 1 } : w
      );
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: true } : w
    ));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows(prev => {
      const maxZ = Math.max(0, ...prev.map(w => w.zIndex));
      return prev.map(w =>
        w.id === id ? { ...w, minimized: false, zIndex: maxZ + 1 } : w
      );
    });
  }, []);

  const clearAllWindows = useCallback(() => {
    setWindows([]);
    windowCounter = 0;
  }, []);

  return (
    <ExperimentContext.Provider value={{
      windows,
      addWindow,
      removeWindow,
      updateWindow,
      bringToFront,
      minimizeWindow,
      restoreWindow,
      clearAllWindows,
    }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
}
