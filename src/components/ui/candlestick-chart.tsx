import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceLine {
  id: string;
  price: number;
  color: string;
  title: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

interface CandlestickChartProps {
  candles: Candle[];
  priceLines?: PriceLine[];
  height?: number;
  emptyMessage?: string;
}

export function CandlestickChart({
  candles,
  priceLines = [],
  height = 300,
  emptyMessage = 'No candle data available',
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.1)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
        timeVisible: true,
      },
      crosshair: {
        horzLine: { color: '#9ca3af', labelBackgroundColor: '#374151' },
        vertLine: { color: '#9ca3af', labelBackgroundColor: '#374151' },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLineSeriesRef.current.clear();
    };
  }, [height]);

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: (c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Update price lines using line series
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const chart = chartRef.current;

    // Remove old price line series
    priceLineSeriesRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch {
        // Series may already be removed
      }
    });
    priceLineSeriesRef.current.clear();

    // Get time range from candles
    const startTime = candles[0].timestamp / 1000;
    const endTime = candles[candles.length - 1].timestamp / 1000;

    const lineStyleMap: Record<string, number> = {
      solid: 0,
      dashed: 2,
      dotted: 1,
    };

    // Create new line series for each price line
    priceLines.forEach((line) => {
      if (line.price > 0) {
        const lineSeries = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: 2,
          lineStyle: lineStyleMap[line.lineStyle || 'solid'],
          priceLineVisible: true,
          lastValueVisible: true,
          title: line.title,
          crosshairMarkerVisible: false,
        });

        // Draw horizontal line across the entire time range
        lineSeries.setData([
          { time: startTime as Time, value: line.price },
          { time: endTime as Time, value: line.price },
        ]);

        priceLineSeriesRef.current.set(line.id, lineSeries);
      }
    });
  }, [priceLines, candles]);

  return (
    <div ref={chartContainerRef} style={{ height }}>
      {candles.length === 0 && (
        <div
          className="flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg h-full"
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
