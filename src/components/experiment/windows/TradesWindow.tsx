import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { trading, type PaginatedResponse } from '@/api/hummingbot-api';
import { TradesTable } from '@/components/trade/trades-table';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TradesWindowProps {
  context?: WindowContext;
}

export function TradesWindow({ context }: TradesWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;

  const [trades, setTrades] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!account) {
      setError('No account selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await trading.getTrades({
        account_names: [account],
        connector_names: connector ? [connector] : undefined,
      });
      setTrades(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  }, [account, connector]);

  useEffect(() => {
    fetchTrades();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  if (loading && !trades) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <TradesTable trades={trades} />;
}
