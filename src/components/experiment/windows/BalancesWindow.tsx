import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { portfolio, type PortfolioBalance } from '@/api/hummingbot-api';
import { BalancesTable } from '@/components/trade/balances-table';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BalancesWindowProps {
  context?: WindowContext;
}

export function BalancesWindow({ context }: BalancesWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;

  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async (showLoading = true) => {
    if (!account) {
      setError('No account selected');
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      // If connector is specified, fetch for that connector only
      // Otherwise fetch all balances for the account
      const connectors = connector ? [connector] : [];
      const state = await portfolio.getState([account], connectors);
      const accountData = state[account];

      if (accountData) {
        // Combine all connector balances
        const allBalances: PortfolioBalance[] = [];
        for (const connectorBalances of Object.values(accountData)) {
          allBalances.push(...connectorBalances);
        }
        // Deduplicate by token (sum values for same token)
        const balanceMap = new Map<string, PortfolioBalance>();
        for (const b of allBalances) {
          const existing = balanceMap.get(b.token);
          if (existing) {
            existing.units += b.units;
            existing.available_units += b.available_units;
            existing.value += b.value;
          } else {
            balanceMap.set(b.token, { ...b });
          }
        }
        setBalances(Array.from(balanceMap.values()));
      } else {
        setBalances([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [account, connector]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleRefresh = () => {
    fetchBalances(false);
  };

  if (loading) {
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
    <BalancesTable
      balances={balances}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
}
