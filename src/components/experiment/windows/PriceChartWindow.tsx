import { useState, useEffect, useCallback } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { marketData } from '@/api/hummingbot-api';
import { CandlestickChart, type Candle } from '@/components/ui/candlestick-chart';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PriceChartWindowProps {
  context?: WindowContext;
}

const TIMEFRAMES = ['1m', '5m', '1h'] as const;
type Timeframe = typeof TIMEFRAMES[number];

export function PriceChartWindow({ context }: PriceChartWindowProps) {
  const connector = context?.connector;
  const pair = context?.pair;

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');

  const fetchCandles = useCallback(async () => {
    if (!connector || !pair) return;

    setLoading(true);
    setError(null);

    const timeframeConfig: Record<Timeframe, { interval: string; max_records: number }> = {
      '1m': { interval: '1m', max_records: 120 },
      '5m': { interval: '5m', max_records: 120 },
      '1h': { interval: '1h', max_records: 120 },
    };
    const config = timeframeConfig[timeframe];

    try {
      const response = await marketData.getCandles({
        connector_name: connector,
        trading_pair: pair,
        interval: config.interval,
        max_records: config.max_records,
      });

      interface CandleResponse {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }
      const data = response as CandleResponse[];
      if (Array.isArray(data) && data.length > 0) {
        const parsedCandles: Candle[] = data
          .map((c) => {
            const timestampMs = c.timestamp > 9999999999 ? c.timestamp : c.timestamp * 1000;
            return {
              timestamp: timestampMs,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        setCandles(parsedCandles);
      } else {
        setCandles([]);
        setError('No candle data available');
      }
    } catch (err) {
      setCandles([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch candle data');
    } finally {
      setLoading(false);
    }
  }, [connector, pair, timeframe]);

  useEffect(() => {
    if (connector && pair) {
      fetchCandles();
    }
  }, [fetchCandles, connector, pair]);

  // No connector/pair configured
  if (!connector || !pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a connector and trading pair to view price chart
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="text-sm font-medium">{pair}</div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('h-6 px-2 text-xs', timeframe === tf && 'font-medium')}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <CandlestickChart candles={candles} height="100%" />
        )}
      </div>
    </div>
  );
}
