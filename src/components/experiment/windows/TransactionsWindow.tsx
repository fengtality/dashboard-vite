import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, History, ExternalLink } from 'lucide-react';
import { gatewaySwap, type PaginatedResponse } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Transaction {
  tx_hash: string;
  trading_pair: string;
  side: string;
  amount: number;
  price?: number;
  status: string;
  created_at: string;
  connector?: string;
  network?: string;
}

interface TransactionsWindowProps {
  context?: WindowContext;
}

export function TransactionsWindow({ context }: TransactionsWindowProps) {
  const connector = context?.connector; // e.g., "solana-mainnet-beta"
  const networkId = connector || '';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await gatewaySwap.search({
        limit: 50,
        network: networkId || undefined,
      });
      // Extract transactions from paginated response
      const data = (res as PaginatedResponse).data || [];
      setTransactions(data as unknown as Transaction[]);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [networkId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
      case 'CONFIRMED':
        return <Badge variant="default" className="bg-positive">Success</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getExplorerUrl = (tx: Transaction) => {
    const network = tx.network || networkId;
    if (network.includes('solana')) {
      return `https://solscan.io/tx/${tx.tx_hash}`;
    } else if (network.includes('ethereum') || network.includes('mainnet')) {
      return `https://etherscan.io/tx/${tx.tx_hash}`;
    } else if (network.includes('arbitrum')) {
      return `https://arbiscan.io/tx/${tx.tx_hash}`;
    } else if (network.includes('base')) {
      return `https://basescan.org/tx/${tx.tx_hash}`;
    } else if (network.includes('polygon')) {
      return `https://polygonscan.com/tx/${tx.tx_hash}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {transactions.length} Transaction{transactions.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchTransactions(false)}
          disabled={refreshing}
          className="h-7 px-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Swap history will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Pair</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Side</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Time</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const explorerUrl = getExplorerUrl(tx);
                return (
                  <tr key={tx.tx_hash} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{tx.trading_pair}</td>
                    <td className="py-2 px-2">
                      <span className={tx.side === 'BUY' ? 'text-positive' : 'text-negative'}>
                        {tx.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {tx.amount.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-2 px-1">
                      {explorerUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          asChild
                        >
                          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
