import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { isPerpetualConnector } from '@/lib/connectors';

export type WindowType =
  | 'price-chart'
  | 'order-book'
  | 'trade-spot'
  | 'trade-perp'
  | 'swap'
  | 'add-liquidity'
  | 'run-bot'
  | 'portfolio'
  | 'orders'
  | 'trades'
  | 'transactions'
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

  // Layout (simplified)
  saveLayout: () => void;
  resetLayout: () => void;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

const WINDOWS_STORAGE_KEY = 'condor-experiment-windows';
const USER_LAYOUT_STORAGE_KEY = 'condor-experiment-user-layout';
const MARKET_STORAGE_KEY = 'condor-experiment-market';

// Default sizes and titles for window types
const WINDOW_DEFAULTS: Record<WindowType, { width: number; height: number; title: string; minWidth: number; minHeight: number }> = {
  'price-chart': { width: 600, height: 400, title: 'Price Chart', minWidth: 400, minHeight: 300 },
  'order-book': { width: 400, height: 500, title: 'Order Book', minWidth: 320, minHeight: 400 },
  'trade-spot': { width: 350, height: 420, title: 'Trade Spot', minWidth: 300, minHeight: 380 },
  'trade-perp': { width: 380, height: 520, title: 'Trade Perp', minWidth: 320, minHeight: 450 },
  'swap': { width: 380, height: 450, title: 'Swap', minWidth: 320, minHeight: 380 },
  'add-liquidity': { width: 400, height: 500, title: 'Add Liquidity', minWidth: 350, minHeight: 420 },
  'run-bot': { width: 400, height: 500, title: 'Run Bot', minWidth: 350, minHeight: 400 },
  'portfolio': { width: 500, height: 400, title: 'Portfolio', minWidth: 400, minHeight: 300 },
  'orders': { width: 600, height: 350, title: 'Orders', minWidth: 450, minHeight: 250 },
  'trades': { width: 550, height: 350, title: 'Trades', minWidth: 400, minHeight: 250 },
  'transactions': { width: 650, height: 400, title: 'Transactions', minWidth: 500, minHeight: 300 },
  'keys': { width: 500, height: 400, title: 'API Keys', minWidth: 400, minHeight: 300 },
};

export function getWindowDefaults(type: WindowType) {
  return WINDOW_DEFAULTS[type];
}

// Default layouts
const DEFAULT_LAYOUTS: Layout[] = [
  {
    id: 'trading-spot',
    name: 'Spot Trading',
    windows: [
      { type: 'price-chart', x: 10, y: 10, width: 650, height: 400 },
      { type: 'order-book', x: 670, y: 10, width: 400, height: 500 },
      { type: 'trade-spot', x: 10, y: 420, width: 350, height: 420 },
      { type: 'portfolio', x: 370, y: 420, width: 500, height: 400 },
    ],
  },
  {
    id: 'trading-perp',
    name: 'Perp Trading',
    windows: [
      { type: 'price-chart', x: 10, y: 10, width: 650, height: 400 },
      { type: 'order-book', x: 670, y: 10, width: 400, height: 500 },
      { type: 'trade-perp', x: 10, y: 420, width: 380, height: 520 },
      { type: 'portfolio', x: 400, y: 420, width: 500, height: 400 },
    ],
  },
  {
    id: 'trading-amm',
    name: 'AMM Trading',
    windows: [
      { type: 'swap', x: 10, y: 10, width: 380, height: 450 },
      { type: 'add-liquidity', x: 400, y: 10, width: 400, height: 500 },
      { type: 'portfolio', x: 10, y: 470, width: 600, height: 350 },
    ],
  },
];

let windowCounter = 0;

// Helper to get default layout based on connector type
function getDefaultLayoutForConnector(connector: string, connectorType: ConnectorType): Layout | undefined {
  if (connectorType === 'gateway') {
    return DEFAULT_LAYOUTS.find(l => l.id === 'trading-amm');
  }
  if (isPerpetualConnector(connector)) {
    return DEFAULT_LAYOUTS.find(l => l.id === 'trading-perp');
  }
  return DEFAULT_LAYOUTS.find(l => l.id === 'trading-spot');
}

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
          // Filter out windows with unknown types (e.g., old 'trade-action')
          const validWindows = parsed.filter((w: WindowState) => w.type in WINDOW_DEFAULTS);
          windowCounter = Math.max(0, ...validWindows.map((w: WindowState) => parseInt(w.id.split('-')[1] || '0')));
          return validWindows;
        }
      }
    } catch { /* ignore */ }
    return [];
  });

  // User's saved layout (or null if using default)
  const [userLayout, setUserLayout] = useState<LayoutWindow[] | null>(() => {
    try {
      const saved = localStorage.getItem(USER_LAYOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch { /* ignore */ }
    return null;
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
    if (userLayout) {
      localStorage.setItem(USER_LAYOUT_STORAGE_KEY, JSON.stringify(userLayout));
    } else {
      localStorage.removeItem(USER_LAYOUT_STORAGE_KEY);
    }
  }, [userLayout]);

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

    // If no windows are open and a pair is selected, apply the user's layout or default
    setWindows(prev => {
      if (prev.length === 0 && pair && selectedConnector) {
        // Use user's saved layout, or fall back to default layout for connector type
        const defaultLayout = getDefaultLayoutForConnector(selectedConnector, selectedConnectorType);
        const layoutWindows = userLayout || defaultLayout?.windows;
        if (layoutWindows) {
          windowCounter = 0;
          const context: WindowContext = {
            connector: selectedConnector,
            connectorType: selectedConnectorType,
            pair,
          };
          return layoutWindows.map((lw, index) => {
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
        }
      }
      // Update existing windows with new pair context
      return prev.map(w => ({
        ...w,
        context: {
          ...w.context,
          pair,
        },
      }));
    });
  }, [selectedConnector, selectedConnectorType, userLayout]);

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

  // Layout methods (simplified)
  const saveLayout = useCallback(() => {
    // Save current windows as user's default layout
    const layoutWindows: LayoutWindow[] = windows.map(w => ({
      type: w.type,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
    }));
    setUserLayout(layoutWindows);
  }, [windows]);

  const resetLayout = useCallback(() => {
    // Clear user's saved layout and apply default based on connector type
    setUserLayout(null);

    // Apply default layout for current connector type
    const defaultLayout = selectedConnector
      ? getDefaultLayoutForConnector(selectedConnector, selectedConnectorType)
      : DEFAULT_LAYOUTS.find(l => l.id === 'trading-spot');
    if (defaultLayout) {
      windowCounter = 0;
      const context = getCurrentContext();
      const newWindows: WindowState[] = defaultLayout.windows.map((lw, index) => {
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
    }
  }, [getCurrentContext, selectedConnector, selectedConnectorType]);

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
      // Layout
      saveLayout,
      resetLayout,
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
