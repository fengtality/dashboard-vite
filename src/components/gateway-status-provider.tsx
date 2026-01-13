import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { gatewayClient } from '@/api/gateway';

interface GatewayStatusContextType {
  status: 'running' | 'stopped' | 'unknown';
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const GatewayStatusContext = createContext<GatewayStatusContextType | undefined>(undefined);

export function GatewayStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const health = await gatewayClient.health();
      setStatus(health.status === 'ok' ? 'running' : 'stopped');
    } catch {
      setStatus('stopped');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <GatewayStatusContext.Provider value={{ status, isLoading, refresh }}>
      {children}
    </GatewayStatusContext.Provider>
  );
}

export function useGatewayStatus() {
  const context = useContext(GatewayStatusContext);
  if (context === undefined) {
    throw new Error('useGatewayStatus must be used within a GatewayStatusProvider');
  }
  return context;
}
