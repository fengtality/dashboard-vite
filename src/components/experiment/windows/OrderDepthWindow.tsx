import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AreaChart, RefreshCw } from 'lucide-react';
import { marketData } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OrderDepthChart } from '@/components/charts/OrderDepthChart';

interface OrderDepthWindowProps {
  context?: WindowContext;
}

export function OrderDepthWindow({ context }: OrderDepthWindowProps) {
  const connector = context?.connector;
  const pair = context?.pair;

  const [orderBook, setOrderBook] = useState<{ bids: unknown[]; asks: unknown[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderBook = useCallback(async () => {
    if (!connector || !pair) return;

    setLoading(true);
    setError(null);

    try {
      const response = await marketData.getOrderBook({
        connector_name: connector,
        trading_pair: pair,
        depth: 30,
      });
      setOrderBook({
        bids: response.bids || [],
        asks: response.asks || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order book');
    } finally {
      setLoading(false);
    }
  }, [connector, pair]);

  useEffect(() => {
    if (connector && pair) {
      fetchOrderBook();
      const interval = setInterval(fetchOrderBook, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchOrderBook, connector, pair]);

  // Parse order book data into standard format
  const { bids, asks, baseSymbol } = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [], baseSymbol: '' };

    const parseLevels = (raw: unknown[]): Array<{ price: number; qty: number }> => {
      return raw.map((level) => {
        let price = 0, qty = 0;
        if (Array.isArray(level)) {
          price = Number(level[0] || 0);
          qty = Number(level[1] || 0);
        } else if (typeof level === 'object' && level !== null) {
          const l = level as Record<string, unknown>;
          price = Number(l.price || 0);
          qty = Number(l.quantity || l.amount || 0);
        }
        return { price, qty };
      }).filter(l => l.price > 0 && l.qty > 0);
    };

    const parsedBids = parseLevels(orderBook.bids).sort((a, b) => b.price - a.price);
    const parsedAsks = parseLevels(orderBook.asks).sort((a, b) => a.price - b.price);
    const baseSymbol = pair?.split('-')[0] || '';

    return { bids: parsedBids, asks: parsedAsks, baseSymbol };
  }, [orderBook, pair]);

  // No connector/pair configured
  if (!connector || !pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AreaChart className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a connector and trading pair to view depth chart
        </p>
      </div>
    );
  }

  if (loading && !orderBook) {
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-sm font-medium">{pair}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={fetchOrderBook}
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Depth Chart */}
      <div className="flex-1 min-h-0">
        <OrderDepthChart
          bids={bids}
          asks={asks}
          baseSymbol={baseSymbol}
          className="h-full"
        />
      </div>
    </div>
  );
}
