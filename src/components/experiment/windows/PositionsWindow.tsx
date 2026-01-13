import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { trading, type PaginatedResponse } from '@/api/hummingbot-api';
import { PositionsTable } from '@/components/trade/positions-table';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PositionsWindowProps {
  context?: WindowContext;
}

export function PositionsWindow({ context }: PositionsWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;

  const [positions, setPositions] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!account) {
      setError('No account selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await trading.getPositions({
        account_names: [account],
        connector_names: connector ? [connector] : undefined,
      });
      setPositions(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  }, [account, connector]);

  useEffect(() => {
    fetchPositions();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  if (loading && !positions) {
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

  return (
    <PositionsTable
      positions={positions}
      markPrice={null}
      currentPrice={null}
    />
  );
}
