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

export type ConnectorType = 'hummingbot' | 'gateway';

export interface WindowContext {
  connector?: string;
  connectorType?: ConnectorType;
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

// Layout template - stores window types and positions (not context)
export interface LayoutWindow {
  type: WindowType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  id: string;
  name: string;
  windows: LayoutWindow[];
}

interface ExperimentContextType {
  // Market selection
  selectedConnector: string;
  selectedConnectorType: ConnectorType;
  selectedPair: string;
  setSelectedConnector: (connector: string, type: ConnectorType) => void;
  setSelectedPair: (pair: string) => void;

  // Windows
  windows: WindowState[];
  addWindow: (type: WindowType, context?: WindowContext) => void;
  addWindowAt: (type: WindowType, x: number, y: number, width?: number, height?: number, context?: WindowContext) => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  clearAllWindows: () => void;

  // Layouts
  layouts: Layout[];
  applyLayout: (layoutId: string) => void;
  saveCurrentLayout: (name: string) => void;
  deleteLayout: (layoutId: string) => void;
  renameLayout: (layoutId: string, newName: string) => void;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

const WINDOWS_STORAGE_KEY = 'condor-experiment-windows';
const LAYOUTS_STORAGE_KEY = 'condor-experiment-layouts';
const MARKET_STORAGE_KEY = 'condor-experiment-market';

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

// Default layouts
const DEFAULT_LAYOUTS: Layout[] = [
  {
    id: 'trading',
    name: 'Trading',
    windows: [
      { type: 'price-chart', x: 10, y: 10, width: 650, height: 400 },
      { type: 'order-book', x: 670, y: 10, width: 320, height: 400 },
      { type: 'trade-action', x: 670, y: 420, width: 320, height: 350 },
      { type: 'balances', x: 10, y: 420, width: 450, height: 300 },
    ],
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    windows: [
      { type: 'orders', x: 10, y: 10, width: 600, height: 300 },
      { type: 'trades', x: 620, y: 10, width: 550, height: 300 },
      { type: 'positions', x: 10, y: 320, width: 600, height: 280 },
      { type: 'balances', x: 620, y: 320, width: 450, height: 280 },
    ],
  },
  {
    id: 'chart-focus',
    name: 'Chart Focus',
    windows: [
      { type: 'price-chart', x: 10, y: 10, width: 800, height: 500 },
      { type: 'order-book', x: 820, y: 10, width: 320, height: 500 },
    ],
  },
];

let windowCounter = 0;

export function ExperimentProvider({ children }: { children: ReactNode }) {
  // Market selection state
  const [selectedConnector, setSelectedConnectorState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(MARKET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.connector || '';
      }
    } catch { /* ignore */ }
    return '';
  });

  const [selectedConnectorType, setSelectedConnectorType] = useState<ConnectorType>(() => {
    try {
      const saved = localStorage.getItem(MARKET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.connectorType || 'hummingbot';
      }
    } catch { /* ignore */ }
    return 'hummingbot';
  });

  const [selectedPair, setSelectedPairState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(MARKET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.pair || '';
      }
    } catch { /* ignore */ }
    return '';
  });

  // Windows state
  const [windows, setWindows] = useState<WindowState[]>(() => {
    try {
      const saved = localStorage.getItem(WINDOWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          windowCounter = Math.max(0, ...parsed.map((w: WindowState) => parseInt(w.id.split('-')[1] || '0')));
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return [];
  });

  // Layouts state
  const [layouts, setLayouts] = useState<Layout[]>(() => {
    try {
      const saved = localStorage.getItem(LAYOUTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with default layouts (defaults take precedence for built-in IDs)
          const customLayouts = parsed.filter((l: Layout) =>
            !DEFAULT_LAYOUTS.some(d => d.id === l.id)
          );
          return [...DEFAULT_LAYOUTS, ...customLayouts];
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_LAYOUTS;
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(windows));
  }, [windows]);

  useEffect(() => {
    localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify({
      connector: selectedConnector,
      connectorType: selectedConnectorType,
      pair: selectedPair,
    }));
  }, [selectedConnector, selectedConnectorType, selectedPair]);

  useEffect(() => {
    // Only save custom layouts (not defaults)
    const customLayouts = layouts.filter(l => !DEFAULT_LAYOUTS.some(d => d.id === l.id));
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify([...DEFAULT_LAYOUTS, ...customLayouts]));
  }, [layouts]);

  // Market selection methods
  const setSelectedConnector = useCallback((connector: string, type: ConnectorType) => {
    setSelectedConnectorState(connector);
    setSelectedConnectorType(type);
    // Update all windows with new connector context
    setWindows(prev => prev.map(w => ({
      ...w,
      context: {
        ...w.context,
        connector,
        connectorType: type,
      },
    })));
  }, []);

  const setSelectedPair = useCallback((pair: string) => {
    setSelectedPairState(pair);
    // Update all windows with new pair context
    setWindows(prev => prev.map(w => ({
      ...w,
      context: {
        ...w.context,
        pair,
      },
    })));
  }, []);

  const getMaxZIndex = useCallback(() => {
    return Math.max(0, ...windows.map(w => w.zIndex));
  }, [windows]);

  const getCurrentContext = useCallback((): WindowContext => ({
    connector: selectedConnector,
    connectorType: selectedConnectorType,
    pair: selectedPair,
  }), [selectedConnector, selectedConnectorType, selectedPair]);

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
      context: context || getCurrentContext(),
    };

    setWindows(prev => [...prev, newWindow]);
  }, [getMaxZIndex, getCurrentContext]);

  const addWindowAt = useCallback((
    type: WindowType,
    x: number,
    y: number,
    width?: number,
    height?: number,
    context?: WindowContext
  ) => {
    const defaults = WINDOW_DEFAULTS[type];
    windowCounter++;

    const newWindow: WindowState = {
      id: `window-${windowCounter}`,
      type,
      title: defaults.title,
      x,
      y,
      width: width || defaults.width,
      height: height || defaults.height,
      zIndex: getMaxZIndex() + 1,
      minimized: false,
      context: context || getCurrentContext(),
    };

    setWindows(prev => [...prev, newWindow]);
  }, [getMaxZIndex, getCurrentContext]);

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

  // Layout methods
  const applyLayout = useCallback((layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (!layout) return;

    // Clear existing windows
    windowCounter = 0;
    const context = getCurrentContext();

    // Create new windows from layout
    const newWindows: WindowState[] = layout.windows.map((lw, index) => {
      windowCounter++;
      const defaults = WINDOW_DEFAULTS[lw.type];
      return {
        id: `window-${windowCounter}`,
        type: lw.type,
        title: defaults.title,
        x: lw.x,
        y: lw.y,
        width: lw.width,
        height: lw.height,
        zIndex: index + 1,
        minimized: false,
        context,
      };
    });

    setWindows(newWindows);
  }, [layouts, getCurrentContext]);

  const saveCurrentLayout = useCallback((name: string) => {
    const id = `custom-${Date.now()}`;
    const layoutWindows: LayoutWindow[] = windows.map(w => ({
      type: w.type,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
    }));

    const newLayout: Layout = {
      id,
      name,
      windows: layoutWindows,
    };

    setLayouts(prev => [...prev, newLayout]);
  }, [windows]);

  const deleteLayout = useCallback((layoutId: string) => {
    // Don't allow deleting default layouts
    if (DEFAULT_LAYOUTS.some(d => d.id === layoutId)) return;
    setLayouts(prev => prev.filter(l => l.id !== layoutId));
  }, []);

  const renameLayout = useCallback((layoutId: string, newName: string) => {
    // Don't allow renaming default layouts
    if (DEFAULT_LAYOUTS.some(d => d.id === layoutId)) return;
    setLayouts(prev => prev.map(l =>
      l.id === layoutId ? { ...l, name: newName } : l
    ));
  }, []);

  return (
    <ExperimentContext.Provider value={{
      // Market
      selectedConnector,
      selectedConnectorType,
      selectedPair,
      setSelectedConnector,
      setSelectedPair,
      // Windows
      windows,
      addWindow,
      addWindowAt,
      removeWindow,
      updateWindow,
      bringToFront,
      minimizeWindow,
      restoreWindow,
      clearAllWindows,
      // Layouts
      layouts,
      applyLayout,
      saveCurrentLayout,
      deleteLayout,
      renameLayout,
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
