import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time, HistogramData } from 'lightweight-charts';

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
  draggable?: boolean;
}

interface CandlestickChartProps {
  candles: Candle[];
  priceLines?: PriceLine[];
  height?: number | string;
  emptyMessage?: string;
  onPriceLineChange?: (id: string, newPrice: number) => void;
}

export function CandlestickChart({
  candles,
  priceLines = [],
  height = '100%',
  emptyMessage = 'No candle data available',
  onPriceLineChange,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const [chartReady, setChartReady] = useState(false);

  // Refs for drag state to avoid stale closures
  const dragStateRef = useRef<{ id: string; startPrice: number } | null>(null);
  const priceLinesRef = useRef(priceLines);
  const onPriceLineChangeRef = useRef(onPriceLineChange);

  // Keep refs in sync
  useEffect(() => {
    priceLinesRef.current = priceLines;
  }, [priceLines]);

  useEffect(() => {
    onPriceLineChangeRef.current = onPriceLineChange;
  }, [onPriceLineChange]);

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const initialHeight = typeof height === 'number' ? height : container.clientHeight || 300;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: initialHeight,
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
        scaleMargins: { top: 0.1, bottom: 0.2 },
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

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    setChartReady(true);

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        const fallbackHeight = typeof height === 'number' ? height : 300;
        chartRef.current.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || fallbackHeight,
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineSeriesRef.current.clear();
      setChartReady(false);
    };
  }, [height]);

  // Setup drag handlers
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const yToPrice = (y: number): number | null => {
      if (!candleSeriesRef.current) return null;
      return candleSeriesRef.current.coordinateToPrice(y);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!onPriceLineChangeRef.current) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const clickPrice = yToPrice(y);
      if (clickPrice === null) return;

      // Find the closest draggable price line within threshold
      const threshold = Math.abs(clickPrice) * 0.005; // 0.5% threshold
      let closestLine: PriceLine | null = null;
      let closestDist = Infinity;

      for (const line of priceLinesRef.current) {
        if (line.draggable && line.price > 0) {
          const dist = Math.abs(line.price - clickPrice);
          if (dist < threshold && dist < closestDist) {
            closestDist = dist;
            closestLine = line;
          }
        }
      }

      if (closestLine) {
        dragStateRef.current = {
          id: closestLine.id,
          startPrice: closestLine.price,
        };
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = 'ns-resize';
        // Disable chart interactions while dragging
        if (chartRef.current) {
          chartRef.current.applyOptions({
            handleScroll: false,
            handleScale: false,
          });
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hoverPrice = yToPrice(y);

      // Handle dragging
      if (dragStateRef.current && onPriceLineChangeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        if (hoverPrice !== null && hoverPrice > 0) {
          onPriceLineChangeRef.current(dragStateRef.current.id, Number(hoverPrice.toFixed(4)));
        }
        return;
      }

      // Handle cursor change on hover
      if (!onPriceLineChangeRef.current || hoverPrice === null) return;

      const threshold = Math.abs(hoverPrice) * 0.005;
      let isNearLine = false;

      for (const line of priceLinesRef.current) {
        if (line.draggable && line.price > 0) {
          const dist = Math.abs(line.price - hoverPrice);
          if (dist < threshold) {
            isNearLine = true;
            break;
          }
        }
      }

      container.style.cursor = isNearLine ? 'ns-resize' : '';
    };

    const handleMouseUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        document.body.style.cursor = '';
        container.style.cursor = '';
        // Re-enable chart interactions
        if (chartRef.current) {
          chartRef.current.applyOptions({
            handleScroll: true,
            handleScale: true,
          });
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Update candle data
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || candles.length === 0) return;

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: (c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(chartData);

    // Set volume data with colors based on candle direction
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData<Time>[] = candles.map((c) => ({
        time: (c.timestamp / 1000) as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, chartReady]);

  // Update price lines using line series
  useEffect(() => {
    if (!chartReady || !chartRef.current || candles.length === 0) return;

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
  }, [priceLines, candles, chartReady]);

  return (
    <div ref={chartContainerRef} style={{ height, width: '100%' }}>
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
