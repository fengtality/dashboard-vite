import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, BookOpen, RefreshCw } from 'lucide-react';
import { marketData } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderDepthChart } from '@/components/charts/OrderDepthChart';

interface OrderBookWindowProps {
  context?: WindowContext;
}

interface ParsedLevel {
  price: number;
  qty: number;
  cumQty: number;
}

export function OrderBookWindow({ context }: OrderBookWindowProps) {
  const connector = context?.connector;
  const pair = context?.pair;

  const [orderBook, setOrderBook] = useState<{ bids: unknown[]; asks: unknown[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cumulative, setCumulative] = useState(true);

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
      const interval = setInterval(fetchOrderBook, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchOrderBook, connector, pair]);

  // Parse order book data
  const { parsedBids, parsedAsks, maxQty, baseSymbol } = useMemo(() => {
    if (!orderBook) return { parsedBids: [], parsedAsks: [], maxQty: 1, baseSymbol: '' };

    const parseBids = (bids: unknown[]): ParsedLevel[] => {
      let cumQty = 0;
      return bids.map((bid) => {
        let price = 0, qty = 0;
        if (Array.isArray(bid)) {
          price = Number(bid[0] || 0);
          qty = Number(bid[1] || 0);
        } else if (typeof bid === 'object' && bid !== null) {
          const b = bid as Record<string, unknown>;
          price = Number(b.price || 0);
          qty = Number(b.quantity || b.amount || 0);
        }
        cumQty += qty;
        return { price, qty, cumQty };
      }).sort((a, b) => b.price - a.price);
    };

    const parseAsks = (asks: unknown[]): ParsedLevel[] => {
      let cumQty = 0;
      return asks.map((ask) => {
        let price = 0, qty = 0;
        if (Array.isArray(ask)) {
          price = Number(ask[0] || 0);
          qty = Number(ask[1] || 0);
        } else if (typeof ask === 'object' && ask !== null) {
          const a = ask as Record<string, unknown>;
          price = Number(a.price || 0);
          qty = Number(a.quantity || a.amount || 0);
        }
        cumQty += qty;
        return { price, qty, cumQty };
      }).sort((a, b) => a.price - b.price);
    };

    const parsedBids = parseBids(orderBook.bids);
    const parsedAsks = parseAsks(orderBook.asks);

    const maxQty = cumulative
      ? Math.max(
          parsedBids.length > 0 ? parsedBids[parsedBids.length - 1].cumQty : 0,
          parsedAsks.length > 0 ? parsedAsks[parsedAsks.length - 1].cumQty : 0,
          1
        )
      : Math.max(
          ...parsedBids.map(b => b.qty),
          ...parsedAsks.map(a => a.qty),
          1
        );

    const baseSymbol = pair?.split('-')[0] || '';

    return { parsedBids, parsedAsks, maxQty, baseSymbol };
  }, [orderBook, cumulative, pair]);

  // No connector/pair configured
  if (!connector || !pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a connector and trading pair to view order book
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
    <Tabs defaultValue="book" className="flex flex-col h-full">
      {/* Header with tabs and controls */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <TabsList className="h-7">
          <TabsTrigger value="book" className="text-xs px-3 h-6">Book</TabsTrigger>
          <TabsTrigger value="depth" className="text-xs px-3 h-6">Depth</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          <Button
            variant={cumulative ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setCumulative(!cumulative)}
            title={cumulative ? 'Cumulative' : 'Individual'}
          >
            Σ
          </Button>
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
      </div>

      {/* Order Book Table */}
      <TabsContent value="book" className="flex-1 mt-0 overflow-hidden">
        <div className="flex flex-col h-full text-xs">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-1 text-muted-foreground mb-1 px-1 shrink-0">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>

          {/* Order Book Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Asks */}
            <div className="flex-1 overflow-y-auto flex flex-col-reverse">
              {[...parsedAsks].reverse().slice(0, 15).map((ask, i) => {
                const displayQty = cumulative ? ask.cumQty : ask.qty;
                const width = (displayQty / maxQty) * 100;
                return (
                  <div key={i} className="relative grid grid-cols-3 gap-1 px-1 py-0.5 hover:bg-muted/30">
                    <div
                      className="absolute inset-0 bg-negative/20"
                      style={{ width: `${width}%`, right: 0, left: 'auto' }}
                    />
                    <span className="relative text-negative">{ask.price.toFixed(2)}</span>
                    <span className="relative text-right">{ask.qty.toFixed(4)}</span>
                    <span className="relative text-right text-muted-foreground">{ask.cumQty.toFixed(4)}</span>
                  </div>
                );
              })}
            </div>

            {/* Spread */}
            <div className="py-1 px-1 border-y border-border bg-muted/30 text-center shrink-0">
              {parsedBids.length > 0 && parsedAsks.length > 0 && (
                <span className="text-muted-foreground">
                  Spread: {(parsedAsks[0].price - parsedBids[0].price).toFixed(2)} ({((parsedAsks[0].price - parsedBids[0].price) / parsedBids[0].price * 100).toFixed(3)}%)
                </span>
              )}
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-y-auto">
              {parsedBids.slice(0, 15).map((bid, i) => {
                const displayQty = cumulative ? bid.cumQty : bid.qty;
                const width = (displayQty / maxQty) * 100;
                return (
                  <div key={i} className="relative grid grid-cols-3 gap-1 px-1 py-0.5 hover:bg-muted/30">
                    <div
                      className="absolute inset-0 bg-positive/20"
                      style={{ width: `${width}%`, right: 0, left: 'auto' }}
                    />
                    <span className="relative text-positive">{bid.price.toFixed(2)}</span>
                    <span className="relative text-right">{bid.qty.toFixed(4)}</span>
                    <span className="relative text-right text-muted-foreground">{bid.cumQty.toFixed(4)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Depth Chart */}
      <TabsContent value="depth" className="flex-1 mt-0 overflow-hidden">
        <OrderDepthChart
          bids={parsedBids.map(b => ({ price: b.price, qty: b.qty }))}
          asks={parsedAsks.map(a => ({ price: a.price, qty: a.qty }))}
          baseSymbol={baseSymbol}
          className="h-full"
        />
      </TabsContent>
    </Tabs>
  );
}
